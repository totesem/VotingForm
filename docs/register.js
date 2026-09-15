const params = new URLSearchParams(window.location.search);

const invitationToken = params.get("invite");
const voterId = params.get("voter");
const ballotId = params.get("ballot");

const status = document.getElementById("status");
const registration = document.getElementById("registration");
const invitedEmail = document.getElementById("invitedEmail");
const message = document.getElementById("message");

let invitation = null;


// --------------------------------------------------
// Check invitation
// --------------------------------------------------

async function checkInvitation() {

    if (!invitationToken) {
        status.textContent = "No invitation provided.";
        return;
    }

    if (!voterId) {
        status.textContent = "No voter specified.";
        return;
    }

    if (!ballotId) {
        status.textContent = "No ballot specified.";
        return;
    }


    const { data, error } =
        await supabaseClient
            .from("auth_guids")
            .select("id, guid, voter_id, ballot_id")
            .eq("guid", invitationToken)
            .eq("voter_id", voterId)
            .eq("ballot_id", ballotId)
            .single();


    if (error || !data) {

        console.error(
            "Invitation lookup error:",
            error
        );

        status.textContent =
            "Invalid invitation.";

        return;
    }


    invitation = data;


    const { data: voter, error: voterError } =
        await supabaseClient
            .from("voters")
            .select("id, roster_email_1, roster_email_2")
            .eq("sharepoint_id", voterId)
            .single();


    if (voterError || !voter) {

        console.error(
            "Voter lookup error:",
            voterError
        );

        status.textContent =
            "Voter record could not be found.";

        return;
    }


    status.textContent =
        `Invitation for ballot: ${data.ballot_id}`;


    invitedEmail.textContent =
        `Invitation sent to: ${voter.roster_email_1}`;


    registration.style.display = "block";
}


// --------------------------------------------------
// Check whether entered email already has an account
//
// Returns:
//   true  = existing user
//   false = no existing user
//   null  = could not determine
// --------------------------------------------------

async function checkExistingUser(email) {

    const maxAttempts = 5;
    const waitTime = 3000;


    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        try {

            const response = await fetch(
                `${SUPABASE_URL}/functions/v1/check-user?email=${encodeURIComponent(email)}`
            );


            if (response.ok) {

                const result = await response.json();

                return result.exists === true;
            }


            console.error(
                `User check attempt ${attempt} failed:`,
                await response.text()
            );

        } catch (error) {

            console.error(
                `User check attempt ${attempt} error:`,
                error
            );
        }


        if (attempt < maxAttempts) {

            await new Promise(
                resolve => setTimeout(resolve, waitTime)
            );
        }
    }


    // We could not determine whether the account exists.
    return null;
}


// --------------------------------------------------
// Create account OR sign in
// --------------------------------------------------

document.getElementById("createAccount").addEventListener(
    "click",
    async function () {

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;


        message.textContent = "";


        if (!email || !password) {

            message.textContent =
                "Please enter your email and password.";

            return;
        }


        if (!invitation) {

            message.textContent =
                "Invalid invitation.";

            return;
        }


        // ---------

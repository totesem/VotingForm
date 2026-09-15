const params = new URLSearchParams(window.location.search);

const invitationToken = params.get("invite");
const voterId = params.get("voter");
const ballotId = params.get("ballot");
const magicAuth = params.get("auth") === "magic";

const status = document.getElementById("status");
const registration = document.getElementById("registration");
const invitedEmail = document.getElementById("invitedEmail");
const message = document.getElementById("message");
const createAccountButton =
    document.getElementById("createAccount");

let invitation = null;


// --------------------------------------------------
// Check invitation
// --------------------------------------------------

async function checkInvitation() {

    if (!invitationToken) {
        status.textContent = "No invitation provided.";
        return false;
    }

    if (!voterId) {
        status.textContent = "No voter specified.";
        return false;
    }

    if (!ballotId) {
        status.textContent = "No ballot specified.";
        return false;
    }

    const maxAttempts = 10;
    const waitTime = 3000;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {

        status.textContent =
            attempt === 1
                ? "Checking your invitation..."
                : "Your invitation is still being prepared. Checking again...";


        try {

            const { data, error } =
                await supabaseClient
                    .from("auth_guids")
                    .select("id, guid, voter_id, ballot_id")
                    .eq("guid", invitationToken)
                    .eq("voter_id", voterId)
                    .eq("ballot_id", ballotId)
                    .single();


            if (!error && data) {

                invitation = data;


                const { data: voter, error: voterError } =
                    await supabaseClient
                        .from("voters")
                        .select("id, roster_email_1, roster_email_2")
                        .eq("sharepoint_id", voterId)
                        .single();


                if (!voterError && voter) {

                    status.textContent =
                        `Invitation for ballot: ${data.ballot_id}`;

                    invitedEmail.textContent =
                        `Invitation sent to: ${voter.roster_email_1}`;

                    createAccountButton.disabled = false;

                    return true;
                }

                console.error(
                    "Voter lookup error:",
                    voterError
                );
            }

        } catch (error) {

            console.error(
                "Invitation check error:",
                error
            );
        }


        if (attempt < maxAttempts) {

            await new Promise(
                resolve => setTimeout(resolve, waitTime)
            );
        }
    }


    status.textContent =
        "Your invitation is taking longer than expected. Please try again in a few moments.";

    return false;
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

    try {

        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/check-user?email=${encodeURIComponent(email)}`
        );

        const responseText = await response.text();

        console.log("check-user status:", response.status);
        console.log("check-user response:", responseText);

        if (!response.ok) {

            message.textContent =
                `Account check failed (${response.status}).`;

            return null;
        }

        const result = JSON.parse(responseText

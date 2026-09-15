const params = new URLSearchParams(window.location.search);

const invitationToken = params.get("invite");
const voterId = params.get("voter");
const ballotId = params.get("ballot");

const status = document.getElementById("status");
const registration = document.getElementById("registration");
const invitedEmail = document.getElementById("invitedEmail");
const message = document.getElementById("message");

let invitation = null;
let existingUser = false;


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
        console.error("Invitation lookup error:", error);
        status.textContent = "Invalid invitation.";
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
        console.error("Voter lookup error:", voterError);
        status.textContent = "Voter record could not be found.";
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
// --------------------------------------------------

async function checkExistingUser(email) {

    try {

        const response = await fetch(
            `${SUPABASE_URL}/functions/v1/check-user?email=${encodeURIComponent(email)}`
        );

        if (!response.ok) {
            console.error(
                "User check failed:",
                await response.text()
            );

            return false;
        }

        const result = await response.json();

        return result.exists === true;

    } catch (error) {

        console.error(
            "Existing-user check error:",
            error
        );

        return false;
    }
}


// --------------------------------------------------
// Create account / sign in
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


        // Check the EMAIL THE USER ENTERED.
        existingUser = await checkExistingUser(email);


        // --------------------------------------------------
        // Existing account → sign in
        // --------------------------------------------------

        if (existingUser) {

            const { data: authData, error: authError } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });

            if (authError) {

                console.error(
                    "Sign-in error:",
                    authError
                );

                message.textContent =
                    "An account already exists with this email. Please check your password.";

                return;
            }

            await completeRegistration(
                authData.user.id,
                email
            );

            return;
        }


        // --------------------------------------------------
        // New account → sign up
        // --------------------------------------------------

        const { data: authData, error: authError } =
            await supabaseClient.auth.signUp({
                email: email,
                password: password
            });

        if (authError) {

            console.error(
                "Sign-up error:",
                authError
            );

            message.textContent =
                authError.message;

            return;
        }

        if (!authData.user) {

            message.textContent =
                "Account could not be created.";

            return;
        }

        await completeRegistration(
            authData.user.id,
            email
        );
    }
);


// --------------------------------------------------
// Finish linking voter to Supabase account
// --------------------------------------------------

async function completeRegistration(userId, email) {

    const { error: voterError } =
        await supabaseClient
            .from("voters")
            .update({
                account_email: email,
                supabase_user_id: userId
            })
            .eq("sharepoint_id", voterId);

    if (voterError) {

        console.error(
            "Voter update error:",
            JSON.stringify(voterError, null, 2)
        );

        message.textContent =
            "Account was authenticated, but the voter record could not be updated.";

        return;
    }


    // Consume the invitation.
    const { error: invitationError } =
        await supabaseClient
            .from("auth_guids")
            .delete()
            .eq("id", invitation.id);

    if (invitationError) {

        console.error(
            "Invitation cleanup error:",
            invitationError
        );

        message.textContent =
            "Account was authenticated, but the invitation could not be completed.";

        return;
    }


    message.textContent =
        "Registration complete!";

    console.log("Registration complete.");
}


// Start.
checkInvitation();

const params = new URLSearchParams(window.location.search);

const invitationToken = params.get("invite");
const voterId = params.get("voter");
const ballotId = params.get("ballot");

const status = document.getElementById("status");
const registration = document.getElementById("registration");
const invitedEmail = document.getElementById("invitedEmail");
const message = document.getElementById("message");

let invitation = null;
let voter = null;
let existingUser = false;


// --------------------------------------------------
// Check invitation and voter
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


    // Check invitation
    const { data: invitationData, error: invitationError } =
        await supabaseClient
            .from("auth_guids")
            .select("id, guid, voter_id, ballot_id")
            .eq("guid", invitationToken)
            .eq("voter_id", voterId)
            .eq("ballot_id", ballotId)
            .single();

    if (invitationError || !invitationData) {

        console.error(
            "Invitation lookup error:",
            invitationError
        );

        status.textContent = "Invalid invitation.";
        return;
    }

    invitation = invitationData;


    // Get voter
    const { data: voterData, error: voterError } =
        await supabaseClient
            .from("voters")
            .select(
                "id, roster_email_1, roster_email_2, account_email, supabase_user_id"
            )
            .eq("sharepoint_id", voterId)
            .single();

    if (voterError || !voterData) {

        console.error(
            "Voter lookup error:",
            voterError
        );

        status.textContent =
            "Voter record could not be found.";

        return;
    }

    voter = voterData;


    // --------------------------------------------------
    // Existing authorized user
    // --------------------------------------------------

    if (voter.supabase_user_id) {

        existingUser = true;

        status.textContent =
            "You already have a VotingForm account.";

        invitedEmail.textContent =
            `Sign in with: ${voter.account_email}`;

        document.getElementById("email").value =
            voter.account_email;

        document.getElementById("email").readOnly = true;

        document.getElementById("createAccount").textContent =
            "Sign In";

        document.getElementById("password").placeholder =
            "Enter your existing password";

    }


    // --------------------------------------------------
    // New user
    // --------------------------------------------------

    else {

        status.textContent =
            `Invitation for ballot: ${ballotId}`;

        invitedEmail.textContent =
            `Invitation sent to: ${voter.roster_email_1}`;

        document.getElementById("createAccount").textContent =
            "Create Account";
    }


    registration.style.display = "block";
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


        // --------------------------------------------------
        // Existing user → sign in
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
                    "The email or password is incorrect.";

                return;
            }

            await completeRegistration(
                authData.user.id,
                email
            );

            return;
        }


        // --------------------------------------------------
        // New user → create account
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
// Complete registration and go to ballot
// --------------------------------------------------

async function completeRegistration(userId, email) {

    // Link Supabase account to voter
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


    // Consume invitation
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


    // Go to ballot
    window.location.href =
        `ballot.html?id=${encodeURIComponent(ballotId)}`;
}


// Start
checkInvitation();

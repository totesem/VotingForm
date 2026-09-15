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

        const result = JSON.parse(responseText);

        return result.exists === true;

    } catch (error) {

        console.error(
            "check-user error:",
            error
        );

        message.textContent =
            "There was a problem checking your account.";

        return null;
    }
}


// --------------------------------------------------
// Create account OR authenticate existing account
// --------------------------------------------------

createAccountButton.addEventListener(
    "click",
    async function () {

        const email =
            document.getElementById("email").value.trim();

        const password =
            document.getElementById("password").value;


        message.textContent = "";


        if (!email) {

            message.textContent =
                "Please enter your email.";

            return;
        }


        if (!invitation) {

            message.textContent =
                "Your invitation has not finished loading. Please wait a moment.";

            return;
        }


        // Prevent double-clicks.
        createAccountButton.disabled = true;


        // --------------------------------------------------
        // Check existing account
        // --------------------------------------------------

        message.textContent =
            "Checking your account...";


        const existingUser =
            await checkExistingUser(email);


        if (existingUser === null) {

            message.textContent =
                "We could not check your account right now. Please try again.";

            createAccountButton.disabled = false;

            return;
        }


        // --------------------------------------------------
        // Existing account → send magic link
        // --------------------------------------------------

        if (existingUser === true) {

            message.textContent =
                "This email already has a VotingForm account. Sending you an authentication link...";


            const redirectUrl =
                `${window.location.origin}${window.location.pathname}` +
                `?invite=${encodeURIComponent(invitationToken)}` +
                `&voter=${encodeURIComponent(voterId)}` +
                `&ballot=${encodeURIComponent(ballotId)}` +
                `&auth=magic`;


            const { error: authError } =
                await supabaseClient.auth.signInWithOtp({
                    email: email,
                    options: {
                        emailRedirectTo: redirectUrl
                    }
                });


            if (authError) {

                console.error(
                    "Authentication link error:",
                    authError
                );

                message.textContent =
                    "We could not send the authentication link. Please try again.";

                createAccountButton.disabled = false;

                return;
            }


            message.textContent =
                "Authentication link sent. Check your email and click the link to continue.";

            return;
        }


        // --------------------------------------------------
        // No existing account → create account
        // --------------------------------------------------

        if (!password) {

            message.textContent =
                "Please enter a password.";

            createAccountButton.disabled = false;

            return;
        }


        message.textContent =
            "Creating your account...";


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

            createAccountButton.disabled = false;

            return;
        }


        if (!authData.user) {

            message.textContent =
                "Account could not be created.";

            createAccountButton.disabled = false;

            return;
        }


        await completeRegistration(
            authData.user.id,
            email
        );
    }
);


// --------------------------------------------------
// Complete registration
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

        createAccountButton.disabled = false;

        return;
    }


    // Consume invitation
    const { error: invitationError } =
        await supabaseClient
            .from("auth_guids")
            .update({
                used_at: new Date().toISOString()
            })
            .eq("id", invitation.id);


    if (invitationError) {

        console.error(
            "Invitation cleanup error:",
            invitationError
        );

        message.textContent =
            "Account was authenticated, but the invitation could not be completed.";

        createAccountButton.disabled = false;

        return;
    }


    // Registration complete.
    message.textContent =
        "Registration complete!";


    // Go to ballot.
    setTimeout(function () {

        window.location.href =
            `ballot.html?id=${encodeURIComponent(ballotId)}`;

    }, 500);
}


// --------------------------------------------------
// Handle return from magic-link authentication
// --------------------------------------------------

async function handleMagicAuthentication() {

    if (!magicAuth) {
        return;
    }


    message.textContent =
        "Completing authentication...";


    const { data, error } =
        await supabaseClient.auth.getSession();


    if (error) {

        console.error(
            "Session error:",
            error
        );

        message.textContent =
            "Authentication could not be completed. Please try again.";

        return;
    }


    if (!data.session || !data.session.user) {

        message.textContent =
            "Authentication could not be completed. Please try the link again.";

        return;
    }


    const user =
        data.session.user;


    await completeRegistration(
        user.id,
        user.email
    );
}


// --------------------------------------------------
// Start
// --------------------------------------------------

async function start() {

    const invitationReady =
        await checkInvitation();


    if (!invitationReady) {
        return;
    }


    await handleMagicAuthentication();
}


start();
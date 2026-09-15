const params = new URLSearchParams(window.location.search);

const invitationToken = params.get("invite");
const voterId = params.get("voter");
const ballotId = params.get("ballot");
const interest = params.get("interest");

const status =
document.getElementById("status");

const registration =
document.getElementById("registration");

const invitedEmail =
document.getElementById("invitedEmail");

const emailInput =
document.getElementById("email");

const passwordInput =
document.getElementById("password");

const confirmPasswordInput =
document.getElementById("confirmPassword");

const confirmPasswordArea =
document.getElementById("confirmPasswordArea");

const button =
document.getElementById("createAccount");

const message =
document.getElementById("message");

let invitation = null;
let invitedEmailAddress = null;
let existingAccount = false;

// --------------------------------------------------
// Check invitation
// --------------------------------------------------

async function checkInvitation() {


if (!invitationToken || !voterId || !ballotId) {

    status.textContent =
        "Invalid invitation.";

    return;
}


const { data, error } =
    await supabaseClient
        .from("auth_guids")
        .select("*")
        .eq("guid", invitationToken)
        .eq("voter_id", voterId)
        .eq("ballot_id", ballotId)
        .maybeSingle();


if (error) {

    console.error(
        "Invitation lookup error:",
        error
    );

    status.textContent =
        "Could not verify your invitation.";

    return;
}


if (!data) {

    status.textContent =
        "This invitation is not valid.";

    return;
}


invitation = data;


const { data: voter, error: voterError } =
    await supabaseClient
        .from("voters")
        .select("roster_email_1, account_email, supabase_user_id")
        .eq("sharepoint_id", voterId)
        .single();


if (voterError || !voter) {

    console.error(
        "Voter lookup error:",
        voterError
    );

    status.textContent =
        "Could not find your voter record.";

    return;
}


invitedEmailAddress =
    voter.roster_email_1;


invitedEmail.textContent =
    `Invitation for: ${invitedEmailAddress}`;


// --------------------------------------------------
// Determine whether this voter already has an account
// --------------------------------------------------

existingAccount =
    !!voter.supabase_user_id;


if (existingAccount) {

    status.textContent =
        "Sign in to access your ballot.";

    button.textContent =
        "Sign In";

    confirmPasswordArea.style.display =
        "none";

} else {

    status.textContent =
        "Create your ballot account.";

    button.textContent =
        "Create Account";

    confirmPasswordArea.style.display =
        "block";
}


emailInput.value =
    voter.account_email ||
    invitedEmailAddress ||
    "";

registration.style.display =
    "block";

updateButton();


}

// --------------------------------------------------
// Enable/disable button
// --------------------------------------------------

function updateButton() {

const email =
    emailInput.value.trim();

const password =
    passwordInput.value;

if (existingAccount) {

    button.disabled =
        !email || !password;

    return;
}


const confirmPassword =
    confirmPasswordInput.value;

button.disabled =
    !email ||
    !password ||
    !confirmPassword ||
    password !== confirmPassword;


}

emailInput.addEventListener(
"input",
updateButton
);

passwordInput.addEventListener(
"input",
updateButton
);

confirmPasswordInput.addEventListener(
"input",
updateButton
);

// --------------------------------------------------
// Complete registration
// --------------------------------------------------

async function completeRegistration(
userId,
email
) {


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
        voterError
    );

    message.textContent =
        "Your account was created, but your voter record could not be updated.";

    return false;
}


const { error: invitationError } =
    await supabaseClient
        .from("auth_guids")
        .update({
            used_at: new Date().toISOString()
        })
        .eq("id", invitation.id);


if (invitationError) {

    console.error(
        "Invitation update error:",
        invitationError
    );

    message.textContent =
        "Your account was created, but your invitation could not be completed.";

    return false;
}


window.location.href =
    `ballot.html?id=${encodeURIComponent(ballotId)}` +
    `&interest=${encodeURIComponent(interest || "")}`

return true;


}

// --------------------------------------------------
// Create account / sign in
// --------------------------------------------------

button.addEventListener(
"click",
async function () {

    button.disabled =
        true;

    message.textContent =
        existingAccount
            ? "Signing in..."
            : "Creating your account...";


    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;


    try {

        // --------------------------------------------------
        // Existing account
        // --------------------------------------------------

        if (existingAccount) {

            const { data, error } =
                await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password
                });


            if (error) {

                console.error(
                    "Sign-in error:",
                    error
                );

                message.textContent =
                    `Sign-in error: ${error.message}`;

                button.disabled =
                    false;

                return;
            }


            await completeRegistration(
                data.user.id,
                data.user.email
            );

            return;
        }


        // --------------------------------------------------
        // New account
        // --------------------------------------------------

        const { data, error } =
            await supabaseClient.auth.signUp({
                email: email,
                password: password
            });


        if (error) {

            console.error(
                "Account creation error:",
                error
            );

            message.textContent =
                `Account creation error: ${error.message}`;

            button.disabled =
                false;

            return;
        }


        if (!data.user) {

            message.textContent =
                "The account could not be created.";

            button.disabled =
                false;

            return;
        }


        // --------------------------------------------------
        // Complete voter registration
        // --------------------------------------------------

        await completeRegistration(
            data.user.id,
            data.user.email
        );

    } catch (error) {

        console.error(
            "Registration error:",
            error
        );

        message.textContent =
            `Error: ${error.message}`;

        button.disabled =
            false;
    }
}

);

// --------------------------------------------------
// Start
// --------------------------------------------------

checkInvitation();

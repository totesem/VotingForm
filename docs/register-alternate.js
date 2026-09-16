const params =
    new URLSearchParams(window.location.search);

const invitationToken =
    params.get("invite");

const status =
    document.getElementById("status");

const registration =
    document.getElementById("registration");

const invitedEmail =
    document.getElementById("invitedEmail");

const nameInput =
    document.getElementById("name");

const emailInput =
    document.getElementById("email");

const passwordInput =
    document.getElementById("password");

const confirmPasswordInput =
    document.getElementById("confirmPassword");

const button =
    document.getElementById("createAccount");

const message =
    document.getElementById("message");

let alternate = null;
let existingAccount = false;

// --------------------------------------------------
// Check invitation
// --------------------------------------------------

async function checkInvitation() {

    if (!invitationToken) {

        status.textContent =
            "Invalid invitation.";

        return;
    }

    try {

        const response =
            await fetch(
                `${SUPABASE_URL}/functions/v1/check-alternate?invite=${encodeURIComponent(invitationToken)}`
            );

        const data =
            await response.json();

        console.log(
            "check-alternate response:",
            response.status,
            data
        );

        if (!response.ok) {

            status.textContent =
                data.error ||
                "This invitation is not valid.";

            return;
        }

        alternate = data;

        existingAccount =
            data.existing_account;

        invitedEmail.textContent =
            `Invitation for: ${alternate.email}`;

        emailInput.value =
            alternate.email;

        if (existingAccount) {

            status.textContent =
                "Sign in to access your ballot.";

            button.textContent =
                "Sign In";

            nameInput.parentElement.parentElement.style.display =
                "none";

            confirmPasswordInput.parentElement.parentElement.style.display =
                "none";

        } else {

            status.textContent =
                "Create your ballot account.";

            button.textContent =
                "Create Account";

            nameInput.parentElement.parentElement.style.display =
                "block";

            confirmPasswordInput.parentElement.parentElement.style.display =
                "block";
        }

        registration.style.display =
            "block";

        updateButton();

    } catch (error) {

        console.error(
            "Alternate invitation error:",
            error
        );

        status.textContent =
            "Could not verify your invitation.";
    }
}

// --------------------------------------------------
// Button validation
// --------------------------------------------------

function updateButton() {

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

    if (existingAccount) {

        button.disabled =
            !email ||
            !password;

        return;
    }

    const name =
        nameInput.value.trim();

    const confirmPassword =
        confirmPasswordInput.value;

    button.disabled =
        !name ||
        !email ||
        !password ||
        !confirmPassword ||
        password !== confirmPassword;
}

nameInput.addEventListener(
    "input",
    updateButton
);

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
// Create account / Sign in
// --------------------------------------------------

button.addEventListener(
    "click",
    async function () {

        button.disabled = true;

        message.textContent =
            existingAccount
                ? "Signing in..."
                : "Creating your account...";

        const name =
            nameInput.value.trim();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        try {

            let user = null;

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

                    button.disabled = false;

                    return;
                }

                user = data.user;

            } else {

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

                    button.disabled = false;

                    return;
                }

                if (!data.user) {

                    message.textContent =
                        "The account could not be created.";

                    button.disabled = false;

                    return;
                }

                user = data.user;
            }

            const {
                data: {
                    session
                }
            } = await supabaseClient.auth.getSession();

            if (!session) {

                message.textContent =
                    "Your account could not be authenticated.";

                button.disabled = false;

                return;
            }

            const response =
                await fetch(
                    `${SUPABASE_URL}/functions/v1/complete-alternate`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization":
                                `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            invitation_id: alternate.id,
                            name: existingAccount
                                ? null
                                : name,
                            email: email
                        })
                    }
                );

            const result =
                await response.json();

            console.log(
                "complete-alternate response:",
                response.status,
                result
            );

            if (!response.ok) {

                message.textContent =
                    result.error ||
                    "Your alternate registration could not be completed.";

                button.disabled = false;

                return;
            }

            window.location.href =
                `ballot.html?id=${encodeURIComponent(
                    alternate.ballot_id
                )}`;

        } catch (error) {

            console.error(
                "Alternate registration error:",
                error
            );

            message.textContent =
                `Error: ${error.message}`;

            button.disabled = false;
        }
    }
);

checkInvitation();
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

// --------------------------------------------------
// Check invitation
// --------------------------------------------------

async function checkInvitation() {

    if (!invitationToken) {

        status.textContent =
            "Invalid invitation.";

        return;
    }

    const response =
    await fetch(
        `${SUPABASE_URL}/functions/v1/check-alternate?invite=${encodeURIComponent(invitationToken)}`
    );

    const data =
        await response.json();

    if (!response.ok) {

        status.textContent =
            data.error ||
            "This invitation is not valid.";

        return;
    }

    alternate = data;

    if (!data) {

        status.textContent =
            "This invitation is not valid.";

        return;
    }

    alternate = data;

    if (alternate.used_at) {

        status.textContent =
            "This alternate invitation has already been used.";

        return;
    }

    invitedEmail.textContent =
        `Invitation for: ${alternate.email}`;

    emailInput.value =
        alternate.email;

    status.textContent =
        "Create your ballot account.";

    registration.style.display =
        "block";

    updateButton();
}


// --------------------------------------------------
// Button validation
// --------------------------------------------------

function updateButton() {

    const name =
        nameInput.value.trim();

    const email =
        emailInput.value.trim();

    const password =
        passwordInput.value;

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
// Create account
// --------------------------------------------------

button.addEventListener(
    "click",
    async function () {

        button.disabled = true;

        message.textContent =
            "Creating your account...";

        const name =
            nameInput.value.trim();

        const email =
            emailInput.value.trim();

        const password =
            passwordInput.value;

        try {

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

            const { error: updateError } =
                await supabaseClient
                    .from("ballot_alternates")
                    .update({
                        name: name,
                        email: email,
                        supabase_user_id:
                            data.user.id,
                        used_at:
                            new Date().toISOString()
                    })
                    .eq(
                        "id",
                        alternate.id
                    );

            if (updateError) {

                console.error(
                    "Alternate update error:",
                    updateError
                );

                message.textContent =
                    "Your account was created, but your alternate invitation could not be completed.";

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
const params = new URLSearchParams(window.location.search);

const invitationToken = params.get("invite");

const status = document.getElementById("status");
const registration = document.getElementById("registration");
const invitedEmail = document.getElementById("invitedEmail");
const message = document.getElementById("message");

let invitation = null;

async function checkInvitation() {

    if (!invitationToken) {
        status.textContent = "No invitation provided.";
        return;
    }

    const { data, error } = await supabaseClient
        .from("invitations")
        .select(`
            id,
            voter_id,
            ballot_id,
            used,
            voters (
                id,
                roster_email_1,
                roster_email_2
            )
        `)
        .eq("invitation_token", invitationToken)
        .single();

    if (error || !data) {
        console.error(error);
        status.textContent = "Invalid invitation.";
        return;
    }

    if (data.used) {
        status.textContent = "This invitation has already been used.";
        return;
    }

    invitation = data;

    status.textContent =
        `Invitation for ballot: ${data.ballot_id}`;

    invitedEmail.textContent =
        `Invitation sent to: ${data.voters.roster_email_1}`;

    registration.style.display = "block";
}

checkInvitation();


document.getElementById("createAccount").addEventListener("click", async function () {

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    message.textContent = "";

    if (!email || !password) {
        message.textContent =
            "Please enter an email and password.";
        return;
    }

    if (!invitation) {
        message.textContent =
            "Invalid invitation.";
        return;
    }

    const { data: authData, error: authError } =
        await supabaseClient.auth.signUp({
            email: email,
            password: password
        });

    if (authError) {
        console.error(authError);
        message.textContent = authError.message;
        return;
    }

    const userId = authData.user.id;

    const { error: voterError } =
        await supabaseClient
            .from("voters")
            .update({
                account_email: email,
                supabase_user_id: userId
            })
            .eq("id", invitation.voter_id);

    if (voterError) {
        console.error(voterError);
        message.textContent =
            "Account created, but voter record could not be updated.";
        return;
    }

    const { error: invitationError } =
        await supabaseClient
            .from("invitations")
            .update({
                used: true
            })
            .eq("id", invitation.id);

    if (invitationError) {
        console.error(invitationError);
        message.textContent =
            "Account created, but invitation could not be completed.";
        return;
    }

    message.textContent =
        "Account created successfully!";
});
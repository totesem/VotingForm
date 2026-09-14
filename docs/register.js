const params = new URLSearchParams(window.location.search);

const invitationToken = params.get("invite");
const voterId = params.get("voter");
const ballotId = params.get("ballot");

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

    if (!voterId) {
        status.textContent = "No voter specified.";
        return;
    }

    if (!ballotId) {
        status.textContent = "No ballot specified.";
        return;
    }

    // Look up the invitation that Power Automate
    // registered in Supabase.
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

    // Find the voter record.
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

checkInvitation();


document.getElementById("createAccount").addEventListener("click", async function () {

    console.log("CREATE ACCOUNT CLICKED");

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
        console.error("Auth error:", authError);
        message.textContent = authError.message;
        return;
    }

    const userId = authData.user.id;

    // Connect the Supabase account to the voter.
    const { error: voterError } =
        await supabaseClient
            .from("voters")
            .update({
                account_email: email,
                supabase_user_id: userId
            })
            .eq("sharepoint_id", voterId);

    if (voterError) {
        console.error("Voter update error:", voterError);
        message.textContent =
            "Account created, but voter record could not be updated.";
        return;
    }

    // Remove the invitation after successful registration.
    const { error: invitationError } =
        await supabaseClient
            .from("auth_guids")
            .delete()
            .eq("id", invitation.id);

    if (invitationError) {
        console.error("Invitation cleanup error:", invitationError);
        message.textContent =
            "Account created, but invitation could not be completed.";
        return;
    }

    message.textContent =
        "Account created successfully!";
});
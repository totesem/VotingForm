const params = new URLSearchParams(window.location.search);

const invitationToken = params.get("invite");

const status = document.getElementById("status");
const registration = document.getElementById("registration");
const invitedEmail = document.getElementById("invitedEmail");
const message = document.getElementById("message");

async function checkInvitation() {

    if (!invitationToken) {
        status.textContent = "No invitation provided.";
        return;
    }

    const { data, error } = await supabaseClient
        .from("invitations")
        .select(`
            id,
            ballot_id,
            used,
            voters (
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

    status.textContent =
        `Invitation for ballot: ${data.ballot_id}`;

    invitedEmail.textContent =
        `Invitation sent to: ${data.voters.roster_email_1}`;

    registration.style.display = "block";
}

checkInvitation();
const params = new URLSearchParams(window.location.search);

const ballotId = params.get("id");
const invitationToken = params.get("invite");

document.getElementById("ballotName").textContent =
    ballotId
        ? `Ballot: ${ballotId}`
        : "No ballot specified";


async function checkAuthentication() {

    const { data: { session }, error } =
        await supabaseClient.auth.getSession();

    const message = document.getElementById("message");

    if (error) {
        console.error(error);
        message.textContent = "Supabase connection error.";
        return;
    }

    if (session) {
        message.textContent =
            `Authenticated as ${session.user.email}`;
        return;
    }

    // Not signed in.
    // Send the voter to registration, preserving the
    // invitation token and ballot name.
    if (invitationToken && ballotId) {


        const voterId = params.get("voter");

        window.location.href =
            `register.html?invite=${encodeURIComponent(invitationToken)}&voter=${encodeURIComponent(voterId)}&ballot=${encodeURIComponent(ballotId)}`;    


        return;
    }

    message.textContent =
        "You must register or sign in to vote.";
}


checkAuthentication();


document.getElementById("voteForm").addEventListener("submit", async function (event) {

    event.preventDefault();

    const { data: { session } } =
        await supabaseClient.auth.getSession();

    if (!session) {
        document.getElementById("message").textContent =
            "You must register or sign in to vote.";
        return;
    }

    const selectedVote =
        document.querySelector('input[name="vote"]:checked');

    if (!selectedVote) {
        document.getElementById("message").textContent =
            "Please select a vote.";
        return;
    }

    const vote = selectedVote.value;

    const comment =
        document.getElementById("comment").value;

    console.log({
        ballotId: ballotId,
        vote: vote,
        comment: comment,
        userId: session.user.id
    });

    document.getElementById("message").textContent =
        "Vote recorded successfully!";
});
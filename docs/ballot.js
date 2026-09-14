const params = new URLSearchParams(window.location.search);
const ballotId = params.get("id");

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
    } else {
        message.textContent =
            "Not currently signed in.";
    }
}

checkAuthentication();

document.getElementById("voteForm").addEventListener("submit", function (event) {

    event.preventDefault();

    const vote =
        document.querySelector('input[name="vote"]:checked').value;

    const comment =
        document.getElementById("comment").value;

    console.log({
        ballotId: ballotId,
        vote: vote,
        comment: comment
    });

    document.getElementById("message").textContent =
        "Vote recorded successfully!";

});
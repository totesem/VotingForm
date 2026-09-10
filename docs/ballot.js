const params = new URLSearchParams(window.location.search);
const ballotId = params.get("id");

document.getElementById("ballotName").textContent =
    ballotId
        ? `Ballot: ${ballotId}`
        : "No ballot specified";

document.getElementById("voteForm").addEventListener("submit", function (event) {

    event.preventDefault();

    const vote = document.querySelector('input[name="vote"]:checked').value;
    const comment = document.getElementById("comment").value;

    console.log({
        ballotId: ballotId,
        vote: vote,
        comment: comment
    });

    document.getElementById("message").textContent =
        "Vote recorded successfully!";

});
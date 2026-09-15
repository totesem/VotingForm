const params = new URLSearchParams(window.location.search);

const ballotId = params.get("id");

const interest = params.get("interest");

document.getElementById("resultsLink").href =
    `results.html?id=${encodeURIComponent(ballotId)}`;

const invitationToken = params.get("invite");


document.getElementById("ballotName").textContent =
ballotId
? `Ballot: ${ballotId}`
: "No ballot specified";

// --------------------------------------------------
// Check authentication
// --------------------------------------------------

async function checkAuthentication() {


const message = document.getElementById("message");
const switchButton = document.getElementById("switchAccount");

const {
    data: { session },
    error: sessionError
} = await supabaseClient.auth.refreshSession();

if (sessionError || !session) {

    message.textContent =
        "You must register or sign in to vote.";

    return;
}

// --------------------------------------------------
// Invitation URL
// --------------------------------------------------

if (invitationToken && ballotId) {

    const voterId = params.get("voter");

    if (!voterId) {
        message.textContent = "Invalid invitation.";
        return;
    }

    // --------------------------------------------------
    // Someone is already signed in.
    // Give them the option to switch accounts.
    // --------------------------------------------------

    if (session) {

        message.textContent =
            `You are currently signed in as ${session.user.email}.`;

        switchButton.style.display = "inline-block";

        switchButton.onclick = async function () {

            switchButton.disabled = true;
            message.textContent = "Signing out...";

            const { error: signOutError } =
                await supabaseClient.auth.signOut();

            if (signOutError) {

                console.error(signOutError);

                message.textContent =
                    "Could not switch accounts.";

                switchButton.disabled = false;
                return;
            }

            window.location.href =
                `register.html?invite=${encodeURIComponent(invitationToken)}` +
                `&voter=${encodeURIComponent(voterId)}` +
                `&ballot=${encodeURIComponent(ballotId)}` +
                `&interest=${encodeURIComponent(interest || "")}`;
        };

        return;
    }

    // --------------------------------------------------
    // Nobody is signed in.
    // Go to registration/sign-in.
    // --------------------------------------------------

    window.location.href =
        `register.html?invite=${encodeURIComponent(invitationToken)}` +
        `&voter=${encodeURIComponent(voterId)}` +
        `&ballot=${encodeURIComponent(ballotId)}` +
        `&interest=${encodeURIComponent(interest || "")}`;

    return;
}

// --------------------------------------------------
// Normal ballot access
// --------------------------------------------------

if (session) {

    message.textContent =
        `Authenticated as ${session.user.email}`;

    return;
}

message.textContent =
    "You must register or sign in to vote.";


}

checkAuthentication();

// --------------------------------------------------
// Submit vote
// --------------------------------------------------

document
.getElementById("voteForm")
.addEventListener("submit", async function (event) {


    event.preventDefault();

    const message =
        document.getElementById("message");

    const submitButton =
        document.querySelector(
            '#voteForm button[type="submit"]'
        );

    // --------------------------------------------------
    // Verify authentication
    // --------------------------------------------------

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {

        message.textContent =
            "You must register or sign in to vote.";

        return;
    }

    // --------------------------------------------------
    // Get selected vote
    // --------------------------------------------------

    const selectedVote =
        document.querySelector(
            'input[name="vote"]:checked'
        );

    if (!selectedVote) {

        message.textContent =
            "Please select a vote.";

        return;
    }

    const vote = selectedVote.value;

    const comment =
        document
            .getElementById("comment")
            .value
            .trim();

    // --------------------------------------------------
    // Prevent double submission
    // --------------------------------------------------

    submitButton.disabled = true;

    message.textContent =
        "Submitting your vote...";

try {

    const response =
        await fetch(
            `${SUPABASE_URL}/functions/v1/submit-vote`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization":
                        `Bearer ${session.access_token}`
                },

                body: JSON.stringify({
                    ballot_id: ballotId,
                    vote: vote,
                    comment: comment
                })
            }
        );

    const result =
        await response.json();

    console.log(
        "submit-vote response:",
        response.status,
        result
    );

    if (!response.ok) {

        message.textContent =
            result.error ||
            "Your vote could not be recorded.";

        submitButton.disabled = false;

        return;
    }

    // --------------------------------------------------
    // Success
    // --------------------------------------------------

    message.textContent =
        "Vote recorded successfully!";

    submitButton.disabled = true;

    document
        .querySelectorAll(
            '#voteForm input, #voteForm textarea'
        )
        .forEach(function (element) {

            element.disabled = true;

        });

} catch (error) {

    console.error(
        "Vote submission error:",
        error
    );

    message.textContent =
        "There was a problem submitting your vote.";

    submitButton.disabled = false;
}


});

const params = new URLSearchParams(window.location.search);

const ballotId = params.get("id");

const interest = params.get("interest");

const alternateEmailInput =
    document.getElementById("alternateEmail");

const createAlternateButton =
    document.getElementById("createAlternate");

const alternateMessage =
    document.getElementById("alternateMessage");

alternateEmailInput.addEventListener(
    "input",
    function () {
        createAlternateButton.disabled =
            !alternateEmailInput.value.trim();
    }
);

createAlternateButton.addEventListener(
    "click",
    async function () {

        const {
            data: { session }
        } = await supabaseClient.auth.getSession();

        if (!session) {
            alternateMessage.textContent =
                "You must be signed in to use an alternate.";

            return;
        }

        createAlternateButton.disabled = true;

        alternateMessage.textContent =
            "Creating alternate invitation...";

        try {

            const response =
                await fetch(
                    `${SUPABASE_URL}/functions/v1/create-alternate`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization":
                                `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                            ballot_id: ballotId,
                            alternate_email:
                                alternateEmailInput.value.trim()
                        })
                    }
                );

            const result =
                await response.json();

            console.log(
                "create-alternate response:",
                response.status,
                result
            );

            if (!response.ok) {
                alternateMessage.textContent =
                    result.error ||
                    "Could not create alternate invitation.";

                createAlternateButton.disabled = false;
                return;
            }

            alternateMessage.textContent =
                `Alternate invitation created for ${result.email}.`;

            document.getElementById("alternateLink").value =
                result.registration_url;

            document.getElementById("alternateLinkArea").style.display =
                "block";

        } catch (error) {

            console.error(
                "Alternate invitation error:",
                error
            );

            alternateMessage.textContent =
                "There was a problem creating the alternate invitation.";

            createAlternateButton.disabled = false;
        }
    }
);

document.getElementById("copyAlternateLink")
    .addEventListener(
        "click",
        async function () {

            const link =
                document.getElementById("alternateLink").value;

            await navigator.clipboard.writeText(link);

            alternateMessage.textContent =
                "Alternate registration link copied.";
        }
    );

document.getElementById("resultsLink").href =
    `results.html?id=${encodeURIComponent(ballotId)}`;

const invitationToken = params.get("invite");

document.getElementById("ballotName").textContent =
    ballotId
    ? `Ballot: ${ballotId}`
    : "No ballot specified";


// --------------------------------------------------
// Load ballot end date
// --------------------------------------------------

async function loadBallotEndDate() {

    if (!ballotId) {
        return;
    }

    const { data: ballotDates, error: ballotDatesError } =
        await supabaseClient
            .from("ballots")
            .select("closes_at")
            .eq("id", ballotId)
            .maybeSingle();

    if (ballotDatesError) {

        console.error(
            "Ballot date lookup error:",
            ballotDatesError
        );

        return;
    }

    if (!ballotDates) {
        return;
    }

    const closeDate =
        new Date(ballotDates.closes_at);

    const formattedCloseDate =
        closeDate.toLocaleDateString(
            undefined,
            {
                year: "numeric",
                month: "long",
                day: "numeric"
            }
        );

    const endDateElement =
        document.getElementById("ballotEndDate");

    if (endDateElement) {

        endDateElement.textContent =
            `Voting ends: ${formattedCloseDate}`;

    }

}

loadBallotEndDate();

// --------------------------------------------------
// Check authentication
// --------------------------------------------------

async function checkAuthentication() {


const message = document.getElementById("message");
const switchButton = document.getElementById("switchAccount");

const {
    data: { session },
    error
} = await supabaseClient.auth.getSession();

if (error) {
    console.error(error);
    message.textContent = "Supabase connection error.";
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
// Load existing vote
// --------------------------------------------------

async function loadExistingVote() {

    const {
        data: { session },
        error: sessionError
    } = await supabaseClient.auth.getSession();

    if (sessionError || !session) {
        return;
    }

    // The vote normally belongs to the signed-in user.
    let voteUserId = session.user.id;

    // Check whether this user is an alternate for this ballot.
    const { data: alternate, error: alternateError } =
        await supabaseClient
            .from("ballot_alternates")
            .select("original_voter_id")
            .eq("ballot_id", ballotId)
            .eq("supabase_user_id", session.user.id)
            .maybeSingle();

    if (alternateError) {

        console.error(
            "Alternate lookup error:",
            alternateError
        );

        return;
    }

    // If this is an alternate, find the original voter's
    // Supabase user ID and use that to find the vote.
    if (alternate) {

        const { data: originalVoter, error: originalVoterError } =
            await supabaseClient
                .from("voters")
                .select("supabase_user_id")
                .eq("id", alternate.original_voter_id)
                .maybeSingle();

        if (originalVoterError || !originalVoter) {

            console.error(
                "Original voter lookup error:",
                originalVoterError
            );

            return;
        }

        voteUserId =
            originalVoter.supabase_user_id;
    }

    const { data: existingVote, error } =
        await supabaseClient
            .from("votes")
            .select("vote, comment")
            .eq("ballot_id", ballotId)
            .eq("supabase_user_id", voteUserId)
            .maybeSingle();

    if (error) {

        console.error(
            "Existing vote lookup error:",
            error
        );

        return;
    }

    if (!existingVote) {
        return;
    }

    const voteInput =
        document.querySelector(
            `input[name="vote"][value="${existingVote.vote}"]`
        );

    if (voteInput) {
        voteInput.checked = true;
    }

    document.getElementById("comment").value =
        existingVote.comment || "";
}

loadExistingVote();

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

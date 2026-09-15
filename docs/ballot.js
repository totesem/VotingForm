const params = new URLSearchParams(window.location.search);

const ballotId = params.get("id");
const invitationToken = params.get("invite");

document.getElementById("ballotName").textContent =
    ballotId
        ? `Ballot: ${ballotId}`
        : "No ballot specified";


// --------------------------------------------------
// Check authentication
// --------------------------------------------------

async function checkAuthentication() {

    const { data: { session }, error } =
        await supabaseClient.auth.getSession();

    const message =
        document.getElementById("message");

    if (error) {

        console.error(error);

        message.textContent =
            "Supabase connection error.";

        return;
    }

    if (session) {

        message.textContent =
            `Authenticated as ${session.user.email}`;

        return;
    }


    // Not signed in.
    // Send the voter to registration.

    if (invitationToken && ballotId) {

        const voterId =
            params.get("voter");

        window.location.href =
            `register.html?invite=${encodeURIComponent(invitationToken)}` +
            `&voter=${encodeURIComponent(voterId)}` +
            `&ballot=${encodeURIComponent(ballotId)}`;

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
        } =
            await supabaseClient.auth.getSession();


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


        const vote =
            selectedVote.value;


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


            // Prevent changing the submitted vote
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
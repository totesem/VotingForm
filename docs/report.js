const params = new URLSearchParams(window.location.search);

const ballotId = params.get("id");

const message = document.getElementById("message");
const ballotName = document.getElementById("ballotName");

const summaryBody = document.getElementById("summaryBody");
const voterBody = document.getElementById("voterBody");


// --------------------------------------------------
// Supabase
// --------------------------------------------------

const SUPABASE_URL =
    "https://ndqegqcxiuhkcpdxcpmw.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_6ByZ7sseW219S8Zlcz2GBg_z0n7140n";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


// --------------------------------------------------
// Check ballot
// --------------------------------------------------

if (!ballotId) {

    ballotName.textContent =
        "No ballot specified.";

    message.textContent =
        "A ballot ID is required.";

} else {

    ballotName.textContent =
        `Ballot: ${ballotId}`;

    loadReport();

}


// --------------------------------------------------
// Load report
// --------------------------------------------------

async function loadReport() {

    //message.textContent =
     //   "Loading report...";

    try {

// ------------------------------------------
// Get voters authorized for this ballot
// ------------------------------------------

        const { data: invitations, error: invitationError } =
            await supabaseClient
                .from("auth_guids")
                .select("supabase_user_id")
                .eq("ballot_id", ballotId)
                .not("supabase_user_id", "is", null);

        if (invitationError) {

            console.error(
                "Invitation lookup error:",
                invitationError
            );

            message.textContent =
                "Could not determine voters for this ballot.";

            return;
        }


        // Get the Supabase user IDs authorized for this ballot

        const ballotUserIds =
            [...new Set(
                invitations.map(
                    invitation => invitation.supabase_user_id
                )
            )];


        // ------------------------------------------
        // Get those voters
        // ------------------------------------------

        const { data: voters, error: voterError } =
            await supabaseClient
                .from("voters")
                .select(
                    "id, name, account_email, roster_email_1, interest_category, supabase_user_id"
                )
                .in(
                    "supabase_user_id",
                    ballotUserIds
                );

        if (voterError) {

            console.error(
                "Voter lookup error:",
                voterError
            );

            message.textContent =
                "Could not load voters.";

            return;
        }


        // ------------------------------------------
        // Get votes for this ballot
        // ------------------------------------------

        const { data: votes, error: voteError } =
            await supabaseClient
                .from("votes")
                .select(
                    "ballot_id, supabase_user_id, vote, comment"
                )
                .eq(
                    "ballot_id",
                    ballotId
                );

        if (voteError) {

            console.error(
                "Vote lookup error:",
                voteError
            );

            message.textContent =
                "Could not load votes.";

            return;
        }


        // ------------------------------------------
        // Build vote lookup
        // ------------------------------------------

        const voteMap = new Map();

        votes.forEach(function (vote) {

            voteMap.set(
                vote.supabase_user_id,
                vote
            );

        });


        // ------------------------------------------
        // Build voter details
        // ------------------------------------------

        const rows = [];


        voters.forEach(function (voter) {

            const vote =
                voteMap.get(
                    voter.supabase_user_id
                );


            rows.push({

                name:
                    voter.name || "",

                email:
                    voter.account_email ||
                    voter.roster_email_1 ||
                    "",

                interest:
                    voter.interest_category ||
                    "",

                vote:
                    vote ? vote.vote : "",

                comment:
                    vote ? vote.comment : ""

            });

        });


        // ------------------------------------------
        // Display voter details
        // ------------------------------------------

        rows.forEach(function (row) {

            const tr =
                document.createElement("tr");


            const nameCell =
                document.createElement("td");

            nameCell.textContent =
                row.name;


            const emailCell =
                document.createElement("td");

            emailCell.textContent =
                row.email;


            const interestCell =
                document.createElement("td");

            interestCell.textContent =
                row.interest;


            const voteCell =
                document.createElement("td");

            voteCell.textContent =
                row.vote || "Did Not Vote";

            if (!row.vote) {

                voteCell.className =
                    "not-voted";

            }


            const commentCell =
                document.createElement("td");

            commentCell.textContent =
                row.comment || "";


            tr.appendChild(nameCell);
            tr.appendChild(emailCell);
            tr.appendChild(interestCell);
            tr.appendChild(voteCell);
            tr.appendChild(commentCell);


            voterBody.appendChild(tr);

        });


        // ------------------------------------------
        // Build summary
        // ------------------------------------------

        const categories = {};

        rows.forEach(function (row) {

            const interest =
                row.interest || "Unknown";


            if (!categories[interest]) {

                categories[interest] = {

                    voters: 0,
                    voted: 0,
                    yes: 0,
                    no: 0,
                    abstain: 0

                };

            }


            categories[interest].voters++;


            if (row.vote) {

                categories[interest].voted++;

            }


            if (row.vote === "Yes") {

                categories[interest].yes++;

            }


            if (row.vote === "No") {

                categories[interest].no++;

            }


            if (row.vote === "Abstain") {

                categories[interest].abstain++;

            }

        });


        // ------------------------------------------
        // Display category summary
        // ------------------------------------------

        Object.keys(categories)
            .sort()
            .forEach(function (interest) {

                const category =
                    categories[interest];


                const tr =
                    document.createElement("tr");


                const totalVotes =
                    category.yes +
                    category.no +
                    category.abstain;


                const yesPercent =
                    category.voters > 0
                    ? (
                        category.yes /
                        category.voters *
                        100
                    ).toFixed(1) + "%"
                    : "#DIV/0!";


                tr.innerHTML = `

                    <td>${interest}</td>

                    <td>${category.voters}</td>

                    <td>${category.voted}</td>

                    <td>
                        ${category.voters - category.voted}
                    </td>

                    <td>${category.yes}</td>

                    <td>${category.no}</td>

                    <td>${category.abstain}</td>

                    <td>${yesPercent}</td>

                `;


                summaryBody.appendChild(tr);

            });


        // ------------------------------------------
        // Vote Total
        // ------------------------------------------

        let totalVoters = 0;
        let totalVoted = 0;
        let totalYes = 0;
        let totalNo = 0;
        let totalAbstain = 0;


        Object.values(categories)
            .forEach(function (category) {

                totalVoters +=
                    category.voters;

                totalVoted +=
                    category.voted;

                totalYes +=
                    category.yes;

                totalNo +=
                    category.no;

                totalAbstain +=
                    category.abstain;

            });


        const totalVotes =
            totalYes +
            totalNo +
            totalAbstain;


        const totalYesPercentValue =
            totalVoters > 0
            ? (
                totalYes /
                totalVoters *
                100
            )
            : null;

        const totalYesPercent =
            totalYesPercentValue !== null
            ? totalYesPercentValue.toFixed(1) + "%"
            : "#DIV/0!";

        const totalYesClass =
            totalYesPercentValue !== null &&
            totalYesPercentValue > 50
            ? "pass"
            : "fail";

        const totalYesTitle =
            totalYesPercentValue !== null &&
            totalYesPercentValue > 50
            ? "Pass"
            : "Fail";


        const totalRow =
            document.createElement("tr");


        totalRow.innerHTML = `

            <td><strong>Vote Total</strong></td>

            <td><strong>${totalVoters}</strong></td>

            <td><strong>${totalVoted}</strong></td>

            <td>
                <strong>${totalVoters - totalVoted}</strong>
            </td>

            <td><strong>${totalYes}</strong></td>

            <td><strong>${totalNo}</strong></td>

            <td><strong>${totalAbstain}</strong></td>

            <td
                class="${totalYesClass}"
                title="${totalYesTitle}"
            >
                <strong>${totalYesPercent}</strong>
</td>

        `;


        summaryBody.appendChild(totalRow);


       //message.textContent =
        //    `Report loaded for ${ballotId}.`;


    } catch (error) {

        console.error(
            "Report error:",
            error
        );

        message.textContent =
            "There was an unexpected error loading the report.";

    }

}
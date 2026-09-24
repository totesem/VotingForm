const SUPABASE_URL =
    "https://ndqegqcxiuhkcpdxcpmw.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_6ByZ7sseW219S8Zlcz2GBg_z0n7140n";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );

const form = document.getElementById("loginForm");
const message = document.getElementById("message");

form.addEventListener("submit", async function (event) {

    event.preventDefault();

    const email =
        document.getElementById("email").value.trim();

    const password =
        document.getElementById("password").value;

    message.textContent = "Signing in...";

    const { error } =
        await supabaseClient.auth.signInWithPassword({
            email: email,
            password: password
        });

    if (error) {

        console.error("Login error:", error);

        message.textContent =
            "Login failed. Please check your email and password.";

        return;
    }

    message.textContent =
        "Login successful. Redirecting...";

    window.location.href = "ballot.html";
});
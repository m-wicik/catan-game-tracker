import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyAi7d-DvIKT-WMnCiCksUrfx1Zaw1pmXX8",
    authDomain: "catan-game-tracker.firebaseapp.com",
    projectId: "catan-game-tracker",
    storageBucket: "catan-game-tracker.firebasestorage.app",
    messagingSenderId: "388660545030",
    appId: "1:388660545030:web:ba397953d8fa538943a587"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const MIN_PLAYERS = 3;
const MAX_PLAYERS = 4;
const MIN_VP = 2;
const MAX_VP = 12;
const WINNING_VP = 10;

const navbar_buttons = new Set();
navbar_buttons.add("home");
navbar_buttons.add("new");
navbar_buttons.add("games");
navbar_buttons.add("stats");
for(const button_id of navbar_buttons) {
    const button_element = document.getElementById(`button_${button_id}`);
    button_element.onclick = () => button_clicked(button_id);
}

const record_type_buttons = new Set();
record_type_buttons.add("basic_entry");
record_type_buttons.add("advanced_entry");
record_type_buttons.add("full_board_entry");

const page_titles = new Map();
page_titles.set("home", "Home");
page_titles.set("new", "Create New Game Record");
page_titles.set("games", "My Played Games");
page_titles.set("stats", "My Stats");

document.getElementById("close_side_pane").onclick = close_side_pane;
document.getElementById("side_pane_overlay").onclick = close_side_pane;

const previous_players = new Set();
let selected_players = [];
const playerVPs = {};

let current_page = "home";
let record_type = "basic_entry";

onAuthStateChanged(auth, (user) => {
    if(user) update_screen();
    else show_login_screen();
});

function button_clicked(button_id) {
    current_page = button_id;
    update_screen();
}

function close_side_pane() {
    document.getElementById("side_pane").classList.remove("open");
    document.getElementById("side_pane_overlay").classList.remove("open");
}

async function create_record() {
    const user = auth.currentUser;
    const date = new Date(document.getElementById("game_date").value);
    try {
        await addDoc(collection(db, "games"), {
            user_id: user.uid,
            players: selected_players,
            vp: playerVPs,
            record_type: record_type,
            date: date,
            created_at: new Date()
        });
        console.log("Game saved");
        current_page = "games";
        update_screen();
    } catch (e) {
        console.error("ERROR:", e);
    }
}

async function load_games() {
    if(!auth.currentUser) return [];

    const q = query(
        collection(db, "games"),
        where("user_id", "==", auth.currentUser.uid)
    );

    const snapshot = await getDocs(q);

    // Map to array of games
    const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Sort by game date (newest first)
    games.sort((a, b) => {
        const dateA = new Date(a.date.seconds * 1000);
        const dateB = new Date(b.date.seconds * 1000);
        return dateB - dateA;
    });

    return games;
}

function login(email, password) {
    signInWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            console.log("Logged in:", userCredential.user.uid);
        })
        .catch(error => {
            console.error(error.message);
        });
}

function open_side_pane(game) {
    const pane = document.getElementById("side_pane");
    const overlay = document.getElementById("side_pane_overlay");
    const content = document.getElementById("side_pane_content");

    content.innerHTML = `
        <h2>Game Details</h2>

        <p><strong>Date:</strong><br>
        ${new Date(game.date.seconds * 1000).toLocaleDateString(
            "en-US",
            { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" }
        )}</p>

        <p><strong>Players:</strong></p>
        <ol>           
            ${game.players
                .map(player => {
                    const vp = game.vp[player];
                    return `<li>${player}: ${vp} VP</li>`;
                })
                .join("")
            }
        </ol>
    `;

    pane.classList.add("open");
    overlay.classList.add("open");
}

function render_record_fields() {
    const fields = document.getElementById("record_fields");
    if(record_type == "basic_entry") {
        fields.innerHTML = `
            <div class="form_section">
                <h2>Date</h3>
                <input class="user_input" type="date" id="game_date">
            </div>
            <div class="form_section">
                <h2>Players</h3>
                <div id="selected_players" style="color: white"></div>
                <input class="user_input" id="player_input" list="player_suggestions"></input>
                <datalist id="player_suggestions"></datalist>
            </div>
            <div class="form_section">
                <h2>Victory Points</h2>
                <table id="vp_table" style="border-collapse: collapse; border-spacing: 0; color: white">
                    <tbody></tbody>
                </table>
            </div>
            <button id="button_create_record" style="display: none">Create Record</button>
        `;
        const date_input = document.getElementById("game_date");
        date_input.value = new Date().toISOString().split("T")[0];
        date_input.addEventListener("change", () => {
            render_selected_players();
            render_victory_points();
        });
        
        const create_record_button = document.getElementById("button_create_record");
        create_record_button.onclick = create_record;
        
        const datalist = document.getElementById("player_suggestions");
        datalist.innerHTML = "";
        for(const name of previous_players) {
            const option = document.createElement("option");
            option.value = name;
            datalist.appendChild(option);
        }

        const input = document.getElementById("player_input");
        input.addEventListener("keydown", (e) => {
            if(e.key == "Enter") {
                e.preventDefault();

                if(selected_players.length >= MAX_PLAYERS) return;

                const name = input.value.trim();
                if(name == "") return;

                if(!selected_players.includes(name)) {
                    selected_players.push(name);
                    playerVPs[name] = MIN_VP;
                }
                previous_players.add(name);

                input.value = "";
                render_selected_players();
                render_victory_points();
            }
        });
    } else if(record_type == "advanced_entry") {
        fields.innerHTML = `
        `;
    } else if(record_type == "full_board_entry") {
        fields.innerHTML = `
        `;
    }
}

function render_selected_players() {
    const container = document.getElementById("selected_players");
    container.innerHTML = "";

    const num_selected = selected_players.length;
    if(num_selected > 0) {
        container.style.marginBottom = "10px";
    } else {
        container.style.marginBottom = "0px";
    }
    for(let i = 0; i < num_selected; i++) {
        const name = selected_players[i];

        const tag = document.createElement("span");
        tag.innerHTML = `${i + 1}. ${name} ✕<br>`;
        tag.style.marginRight = "8px";
        tag.style.cursor = "pointer";

        tag.onclick = () => {
            selected_players.splice(selected_players.indexOf(name), 1);
            delete playerVPs[name];
            render_selected_players();
            render_victory_points();
        };

        container.appendChild(tag);
    }
    const date_input = document.getElementById("game_date");
    const create_record_button = document.getElementById("button_create_record");
    create_record_button.style.display = (date_input.value.trim() != "" && selected_players.length >= MIN_PLAYERS && validate_VPs()) ? "inline-block" : "none";
}

function render_victory_points() {
    const tbody = document.querySelector("#vp_table tbody");
    tbody.innerHTML = "";

    selected_players.forEach((player) => {
        const row = document.createElement("tr");

        // Name
        const nameCell = document.createElement("td");
        nameCell.innerText = player;
        nameCell.style.flex = "0 0 auto";
        nameCell.style.padding = "2px 4px";
        nameCell.style.paddingRight = "10px";

        // Minus
        const minusCell = document.createElement("td");
        const minusBtn = document.createElement("button");
        minusBtn.innerText = "−";
        minusCell.appendChild(minusBtn);

        // Input
        const inputCell = document.createElement("td");
        const input = document.createElement("input");
        input.type = "number";
        input.min = MIN_VP;
        input.max = MAX_VP;
        input.value = playerVPs[player] ?? MIN_VP;
        input.style.width = "40px";
        input.style.textAlign = "center";
        inputCell.appendChild(input);

        // Plus
        const plusCell = document.createElement("td");
        const plusBtn = document.createElement("button");
        plusBtn.innerText = "+";
        plusCell.appendChild(plusBtn);

        // Update buttons
        function updateButtons() {
            const val = parseInt(input.value);
            minusBtn.style.visibility = val <= MIN_VP ? "hidden" : "visible";
            plusBtn.style.visibility = val >= MAX_VP ? "hidden" : "visible";
        }
        updateButtons();

        // Button logic
        minusBtn.onclick = () => {
            input.value = Math.max(MIN_VP, parseInt(input.value) - 1);
            playerVPs[player] = parseInt(input.value);
            updateButtons();
            render_selected_players();
        };
        plusBtn.onclick = () => {
            input.value = Math.min(MAX_VP, parseInt(input.value) + 1);
            playerVPs[player] = parseInt(input.value);
            updateButtons();
            render_selected_players();
        };

        input.addEventListener("input", () => {
            let val = parseInt(input.value);
            if (isNaN(val)) val = MIN_VP;
            val = Math.max(MIN_VP, Math.min(MAX_VP, val));
            input.value = val;
            playerVPs[player] = val;
            updateButtons();
        });

        row.appendChild(nameCell);
        row.appendChild(minusCell);
        row.appendChild(inputCell);
        row.appendChild(plusCell);

        tbody.appendChild(row);
    });
}

function set_record_type(button_id) {
    record_type = button_id;
    if(record_type == "basic_entry") {
        selected_players.length = 0;
        for(const player in playerVPs) delete playerVPs[player];
    }
    render_record_fields();
}

function show_login_screen() {
    document.getElementById("page_name").innerText = "Welcome";

    const content = document.getElementById("page_content");

    content.innerHTML = `
        <div class="form_section">
            <h2>Log In / Sign Up</h2>

            <input class="user_input" id="email_input" placeholder="Email"><br><br>
            <input class="user_input" id="password_input" type="password" placeholder="Password"><br><br>

            <div style="display: flex">
                <button class="halfwidth_button" style="height:50px" id="login_button">Log In</button>
                <button class="halfwidth_button" style="height:50px" id="signup_button">Create Account</button>
            </div>
        </div>
    `;

    document.getElementById("login_button").onclick = () => {
        const email = document.getElementById("email_input").value;
        const password = document.getElementById("password_input").value;
        login(email, password);
    };

    document.getElementById("signup_button").onclick = () => {
        const email = document.getElementById("email_input").value;
        const password = document.getElementById("password_input").value;
        signup(email, password);
    };
}

function signup(email, password) {
    createUserWithEmailAndPassword(auth, email, password)
        .then(userCredential => {
            console.log("User created:", userCredential.user.uid);
        })
        .catch(error => {
            console.error(error.message);
        });
}

function update_screen() {
    document.getElementById("button_navigation").style.display = "flex";
    const title = document.getElementById("page_name");
    title.innerText = page_titles.get(current_page);
    const content = document.getElementById("page_content");
    selected_players = [];
    if(current_page == "new") {
        content.innerHTML = `
            <div class="form_section">
                <h2>Record Type</h2>
                <div id="record_type_buttons">
                    <button class="thirdwidth_button" id="button_basic_entry">Basic</button>
                    <button class="thirdwidth_button" id="button_advanced_entry">Advanced</button>
                    <button class="thirdwidth_button" id="button_full_board_entry">Full Board</button>
                </div>
            </div>
            <div id="record_fields"></div>
        `;
        for(const button_id of record_type_buttons) {
            const button_element = document.getElementById(`button_${button_id}`);
            button_element.onclick = () => set_record_type(button_id);
        }
        render_record_fields();
    } else if (current_page === "games") {
        content.innerHTML = "<div id='games_list'></div>";
        const gamesList = document.getElementById("games_list");
        gamesList.style.color = "white";

        load_games().then(games => {
            if(games.length == 0) {
                gamesList.innerHTML = "<p>You haven't recorded any games yet!</p>";
                return;
            }

            games.forEach(game => {
                const gameDiv = document.createElement("div");
                gameDiv.classList.add("game_item");             
                gameDiv.onclick = () => {open_side_pane(game);};

                const vpEntries = Object.entries(game.vp);
                const winner = vpEntries.reduce((max, curr) => (curr[1] > max[1] ? curr : max))[0];
                const playersHtml = game.players
                    .map(player =>
                        player === winner
                            ? `<span style="color: #4CAF50; font-weight: bold;">${player}</span>`
                            : `<span style="color: white;">${player}</span>`
                    )
                    .join(", ");
                
                gameDiv.innerHTML = `
                    <strong>${new Date(game.date.seconds * 1000).toLocaleDateString(
                        'en-US',
                        { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' }
                    )}:</strong> ${playersHtml}<br>
                    <i class="fa-solid fa-pen-to-square edit_game_icon"></i>
                    <i class="fa-solid fa-trash delete_game_icon"></i>
                `;

                const editIcon = gameDiv.querySelector(".edit_game_icon");          
                editIcon.onclick = (e) => {
                    e.stopPropagation();
                    console.log("Edit game:", game.id);
                };

                const deleteIcon = gameDiv.querySelector(".delete_game_icon");
                deleteIcon.onclick = async (e) => {
                    e.stopPropagation();
                    const confirmed = confirm(`Are you sure you want to delete this game record?`);
                    if (!confirmed) return;
                    try {
                        await deleteDoc(doc(db, "games", game.id));
                        console.log("Game deleted");
                        gameDiv.remove();
                    } catch (e) {
                        console.error("Delete error:", e);
                    }
                };
                gamesList.appendChild(gameDiv);
            });
        });
    } else {
        content.innerHTML = "";
    }
}

function validate_VPs() {
    let count = 0;
    for(const player of selected_players) {
        if((playerVPs[player] ?? MIN_VP) >= WINNING_VP) count++;
    }
    return count == 1;
}
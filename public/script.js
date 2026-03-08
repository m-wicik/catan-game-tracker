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

const previous_players = new Set();
let selected_players = [];
const playerVPs = {};

let current_page = "home";
let record_type = "basic_entry";

function button_clicked(button_id) {
    current_page = button_id;
    update_screen();
}

function render_record_fields() {
    const fields = document.getElementById("record_fields");
    if(record_type == "basic_entry") {
        fields.innerHTML = `
            <div class="form_section">
                <h2>Players</h3>
                <div id="selected_players" style="color: white"></div>
                <input id="player_input" list="player_suggestions"></input>
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
    const create_record_button = document.getElementById("button_create_record");
    create_record_button.style.display = (num_selected >= MIN_PLAYERS && validate_VPs()) ? "inline-block" : "none";
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

function update_screen() {
    const title = document.getElementById("page_name");
    title.innerText = page_titles.get(current_page);
    const content = document.getElementById("page_content");
    selected_players = [];
    if(current_page == "new") {
        content.innerHTML = `
            <div class="form_section">
                <h2>Record Type</h2>
                <div id="record_type_buttons">
                    <button id="button_basic_entry">Basic</button>
                    <button id="button_advanced_entry">Advanced</button>
                    <button id="button_full_board_entry">Full Board</button>
                </div>
            </div>
            <div id="record_fields"></div>
        `;
        for(const button_id of record_type_buttons) {
            const button_element = document.getElementById(`button_${button_id}`);
            button_element.onclick = () => set_record_type(button_id);
        }
        render_record_fields();
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
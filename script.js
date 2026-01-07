// Game State
const state = {
    matchedPairs: [],
    score: 0,
    timeLeft: 300,
    timer: null,

    currentTerms: [],
    selectedTerm: null,

    currentFillSentences: [],
    currentFillOptions: [],
    selectedOption: null,
    filledBlanks: [],
    currentSentenceIndex: 0,

    quizQuestions: [],
    currentQuestionIndex: 0,

    selectedUnit: 0,
    selectedCategory: "",
};

let currentGame = "matching";

// Loading Screen
window.addEventListener("load", () => {
    setTimeout(() => {
        document.getElementById("loadingScreen").classList.add("hidden");
    }, 600);
});

// Initialize
function init() {
    const unitSelect = document.getElementById("unitSelect");

    data.units.forEach((unit, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = unit.name;
        unitSelect.appendChild(opt);
    });

    state.selectedUnit = 0;
    updateCategories();

    unitSelect.onchange = () => {
        state.selectedUnit = parseInt(unitSelect.value);
        updateCategories();
    };

    document.getElementById("categorySelect").onchange = () => {
        state.selectedCategory =
            document.getElementById("categorySelect").value;
        startGame();
    };

    document.querySelectorAll(".tab").forEach((tab) => {
        tab.onclick = () => {
            const tabId = tab.dataset.tab;

            document
                .querySelectorAll(".tab")
                .forEach((t) => t.classList.remove("active"));
            document
                .querySelectorAll(".tab-content")
                .forEach((c) => c.classList.remove("active"));

            tab.classList.add("active");
            document.getElementById(`${tabId}Game`).classList.add("active");

            currentGame = tabId;

            if (tabId === "filling") {
                filterUnitsForFill();
            } else {
                populateAllUnits();
            }

            startGame();
        };
    });
}

function populateAllUnits() {
    const unitSelect = document.getElementById("unitSelect");
    unitSelect.innerHTML = "";

    data.units.forEach((unit, i) => {
        const opt = document.createElement("option");
        opt.value = i;
        opt.textContent = unit.name;
        unitSelect.appendChild(opt);
    });

    state.selectedUnit = 0;
    updateCategories();
}

function filterUnitsForFill() {
    const unitSelect = document.getElementById("unitSelect");
    unitSelect.innerHTML = "";

    let firstValid = -1;

    data.units.forEach((unit, i) => {
        const hasFill = Object.keys(unit.categories).some((cat) => {
            const items = unit.categories[cat];
            return items.some(
                (item) =>
                    (item.sentence && item.answer) ||
                    cat === "Fill in the Blank"
            );
        });

        if (hasFill) {
            const opt = document.createElement("option");
            opt.value = i;
            opt.textContent = unit.name;
            unitSelect.appendChild(opt);

            if (firstValid === -1) firstValid = i;
        }
    });

    state.selectedUnit = firstValid;
    if (firstValid >= 0) unitSelect.value = firstValid;

    updateCategories();
}

function updateCategories() {
    const catSelect = document.getElementById("categorySelect");
    catSelect.innerHTML = "";

    if (state.selectedUnit < 0 || state.selectedUnit >= data.units.length) {
        state.selectedCategory = "";
        return;
    }

    const unit = data.units[state.selectedUnit];
    let cats = Object.keys(unit.categories);

    if (currentGame === "filling") {
        if (cats.includes("Fill in the Blank")) {
            cats = ["Fill in the Blank"];
        } else {
            cats = cats.filter((cat) => {
                const items = unit.categories[cat];
                return items.some((item) => item.sentence && item.answer);
            });
        }
    }

    cats.forEach((cat) => {
        const opt = document.createElement("option");
        opt.value = cat;
        opt.textContent = cat;
        catSelect.appendChild(opt);
    });

    if (cats.length > 0) {
        state.selectedCategory = cats[0];
        catSelect.value = cats[0];
    } else {
        state.selectedCategory = "";
    }

    startGame();
}

function getCurrentData() {
    if (state.selectedUnit < 0 || !state.selectedCategory) return [];

    const unit = data.units[state.selectedUnit];
    return unit.categories[state.selectedCategory] || [];
}

function getAllData() {
    const unit = data.units[state.selectedUnit];
    let all = [];

    Object.keys(unit.categories).forEach((cat) => {
        all = all.concat(unit.categories[cat]);
    });

    return all;
}

function showFeedback(msg, isError = false) {
    const toast = document.getElementById("feedbackToast");
    toast.textContent = msg;
    toast.className = `feedback-toast ${isError ? "error" : "success"} show`;

    setTimeout(() => toast.classList.remove("show"), 1500);
}

function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

// MATCHING GAME
function renderMatching() {
    const terms = document.getElementById("terms");
    const defs = document.getElementById("definitions");

    terms.innerHTML = "";
    defs.innerHTML = "";

    if (state.currentTerms.length === 0) {
        terms.innerHTML = '<div class="no-data">No terms available</div>';
        defs.innerHTML = '<div class="no-data">No definitions available</div>';
        return;
    }

    state.currentTerms.forEach((item) => {
        const div = document.createElement("div");
        div.className = `item ${
            state.matchedPairs.includes(item.term) ? "matched" : ""
        }`;
        div.dataset.term = item.term;
        div.textContent = item.term;
        terms.appendChild(div);
    });

    shuffle([...state.currentTerms]).forEach((item) => {
        const div = document.createElement("div");
        div.className = `item ${
            state.matchedPairs.includes(item.term) ? "matched" : ""
        }`;
        div.dataset.term = item.term;
        div.textContent = item.definition;
        defs.appendChild(div);
    });

    setupMatchingHandlers();
    updateProgress();
}

function setupMatchingHandlers() {
    if (state.selectedTerm) {
        state.selectedTerm.classList.remove("selected");
        state.selectedTerm = null;
    }

    document.querySelectorAll("#terms .item:not(.matched)").forEach((term) => {
        term.onclick = () => {
            if (state.selectedTerm)
                state.selectedTerm.classList.remove("selected");
            term.classList.add("selected");
            state.selectedTerm = term;

            document.getElementById("instruction").textContent =
                "Now select the matching definition";
        };
    });

    document
        .querySelectorAll("#definitions .item:not(.matched)")
        .forEach((def) => {
            def.onclick = () => {
                if (!state.selectedTerm) {
                    showFeedback("Select a term first", true);
                    return;
                }

                const termValue = state.selectedTerm.dataset.term;
                const defTerm = def.dataset.term;

                if (termValue === defTerm) {
                    state.matchedPairs.push(termValue);
                    state.score += 10;
                    updateScore();

                    state.selectedTerm.classList.add("matched");
                    def.classList.add("matched");

                    showFeedback("Correct! +10 points");
                    document.getElementById("instruction").textContent =
                        "Great! Select another term";

                    setTimeout(() => {
                        if (
                            state.matchedPairs.length ===
                            state.currentTerms.length
                        ) {
                            endGame(true);
                        }
                    }, 400);

                    state.selectedTerm = null;
                } else {
                    state.score = Math.max(0, state.score - 5);
                    updateScore();

                    state.selectedTerm.classList.add("wrong");
                    def.classList.add("wrong");

                    showFeedback("Incorrect -5 points", true);

                    setTimeout(() => {
                        state.selectedTerm.classList.remove(
                            "wrong",
                            "selected"
                        );
                        def.classList.remove("wrong");
                        state.selectedTerm = null;

                        document.getElementById("instruction").textContent =
                            "Select a term and match it";
                    }, 800);
                }
            };
        });
}

// FILL IN THE BLANK
function prepareFill() {
    let items = getCurrentData();
    if (!items || items.length === 0) return false;

    const hasSentences = items.some((item) => item.sentence && item.answer);

    if (!hasSentences) {
        items = items
            .map((item) => ({
                sentence: item.definition
                    ? item.definition.replace(item.term, "___")
                    : null,
                answer: item.term || null,
            }))
            .filter((item) => item.sentence && item.answer);
    }

    if (items.length === 0) return false;

    const shuffled = shuffle(items);
    state.currentFillSentences = shuffled.slice(
        0,
        Math.min(5, shuffled.length)
    );
    state.currentFillOptions = state.currentFillSentences.map(
        (item) => item.answer
    );
    state.currentSentenceIndex = 0;
    state.filledBlanks = [];

    return true;
}

function renderFillSentence() {
    const sentenceDiv = document.getElementById("fillSentence");
    const optionsDiv = document.getElementById("fillOptions");

    if (state.currentFillSentences.length === 0) {
        sentenceDiv.innerHTML =
            '<div class="no-data">No sentences available</div>';
        optionsDiv.innerHTML = "";
        return;
    }

    const current = state.currentFillSentences[state.currentSentenceIndex];

    let html = "";
    if (current.sentence.includes("___")) {
        const parts = current.sentence.split("___");
        html =
            parts[0] +
            '<span class="fill-blank" id="currentBlank">_____</span>' +
            (parts[1] || "");
    } else {
        const regex = new RegExp(`\\b${current.answer}\\b`, "i");
        html = current.sentence.replace(
            regex,
            '<span class="fill-blank" id="currentBlank">_____</span>'
        );
    }

    sentenceDiv.innerHTML = html;

    optionsDiv.innerHTML = "";
    shuffle([...state.currentFillOptions]).forEach((opt) => {
        const div = document.createElement("div");
        div.className = `option ${
            state.filledBlanks.includes(opt) ? "used" : ""
        }`;
        div.dataset.option = opt;
        div.textContent = opt;
        optionsDiv.appendChild(div);

        if (!state.filledBlanks.includes(opt)) {
            div.onclick = () => {
                state.selectedOption = opt;

                document
                    .querySelectorAll(".option:not(.used)")
                    .forEach((o) => o.classList.remove("selected"));
                div.classList.add("selected");

                document.getElementById("instruction").textContent =
                    "Click the blank to fill it";
                document.getElementById("currentBlank").onclick = fillBlank;
            };
        }
    });

    updateProgress();
}

function fillBlank() {
    if (!state.selectedOption) {
        showFeedback("Select an option first", true);
        return;
    }

    const blank = document.getElementById("currentBlank");
    const current = state.currentFillSentences[state.currentSentenceIndex];

    if (state.selectedOption === current.answer) {
        blank.textContent = state.selectedOption;
        blank.classList.add("filled");

        document
            .querySelector(`.option[data-option="${state.selectedOption}"]`)
            .classList.add("used");

        state.filledBlanks.push(state.selectedOption);
        state.score += 10;
        updateScore();

        showFeedback("Correct! +10 points");

        setTimeout(() => {
            if (
                state.currentSentenceIndex <
                state.currentFillSentences.length - 1
            ) {
                state.currentSentenceIndex++;
                state.selectedOption = null;
                renderFillSentence();
            } else {
                endGame(true);
            }
        }, 800);
    } else {
        blank.classList.add("wrong");

        state.score = Math.max(0, state.score - 5);
        updateScore();

        showFeedback("Incorrect -5 points", true);

        setTimeout(() => {
            blank.classList.remove("wrong");
            document
                .querySelector(".option.selected")
                .classList.remove("selected");
            state.selectedOption = null;

            document.getElementById("instruction").textContent =
                "Select the correct option";
        }, 800);
    }

    blank.onclick = null;
}

// QUICK QUIZ
function prepareQuiz() {
    const all = getAllData();

    if (all.length === 0) return false;

    const questions = [];

    all.forEach((item) => {
        if (item.term && item.definition) {
            const wrong = shuffle(
                all
                    .filter((i) => i.term !== item.term && i.definition)
                    .map((i) => i.definition)
            ).slice(0, 3);

            if (wrong.length === 3) {
                questions.push({
                    question: `What is the definition of: ${item.term}?`,
                    correct: item.definition,
                    options: shuffle([item.definition, ...wrong]),
                });
            }
        }
    });

    state.quizQuestions = shuffle(questions).slice(
        0,
        Math.min(20, questions.length)
    );
    state.currentQuestionIndex = 0;

    return state.quizQuestions.length > 0;
}

function renderQuiz() {
    const content = document.getElementById("quizContent");

    if (state.quizQuestions.length === 0) {
        content.innerHTML = '<div class="no-data">No questions available</div>';
        return;
    }

    const q = state.quizQuestions[state.currentQuestionIndex];
    const num = state.currentQuestionIndex + 1;

    let html = `
        <div class="question-card">
            <span class="question-number">Question ${num} of ${state.quizQuestions.length}</span>
            <div class="question-text">${q.question}</div>
            <div class="answers-grid">
    `;

    q.options.forEach((opt, i) => {
        html += `<div class="answer-option" data-answer="${opt}">${String.fromCharCode(
            65 + i
        )}. ${opt}</div>`;
    });

    html += `</div></div>`;

    if (state.currentQuestionIndex < state.quizQuestions.length - 1) {
        html += `<div class="quiz-navigation"><button class="btn btn-primary" id="nextQuestion">Next Question</button></div>`;
    }

    content.innerHTML = html;

    document.querySelectorAll(".answer-option").forEach((opt) => {
        opt.onclick = () => {
            const selected = opt.dataset.answer;
            const isCorrect = selected === q.correct;

            document.querySelectorAll(".answer-option").forEach((o) => {
                o.style.pointerEvents = "none";
                if (o.dataset.answer === q.correct) {
                    o.classList.add("correct");
                } else if (o === opt && !isCorrect) {
                    o.classList.add("incorrect");
                }
            });

            if (isCorrect) {
                state.score += 10;
                updateScore();
                showFeedback("Correct! +10 points");
            } else {
                state.score = Math.max(0, state.score - 5);
                updateScore();
                showFeedback("Incorrect -5 points", true);
            }

            setTimeout(() => {
                if (
                    state.currentQuestionIndex <
                    state.quizQuestions.length - 1
                ) {
                    state.currentQuestionIndex++;
                    renderQuiz();
                } else {
                    endGame(true);
                }
            }, 1500);
        };
    });

    updateProgress();
}

// COMMON FUNCTIONS
function startGame() {
    state.matchedPairs = [];
    state.score = 0;
    state.timeLeft = 300;
    state.selectedTerm = null;

    updateScore();

    if (state.timer) clearInterval(state.timer);

    if (currentGame === "matching") {
        document.getElementById("instruction").textContent =
            "Select a term and match it with its definition";
        const data = getCurrentData();
        if (data.length === 0) {
            document.getElementById("terms").innerHTML =
                '<div class="no-data">No data available</div>';
            document.getElementById("definitions").innerHTML = "";
            return;
        }
        state.currentTerms = shuffle(data).slice(0, Math.min(10, data.length));
        renderMatching();
    } else if (currentGame === "filling") {
        document.getElementById("instruction").textContent =
            "Select the correct option to fill in the blank";
        if (!prepareFill()) {
            document.getElementById("fillSentence").innerHTML =
                '<div class="no-data">No suitable content</div>';
            document.getElementById("fillOptions").innerHTML = "";
            return;
        }
        renderFillSentence();
    } else if (currentGame === "quiz") {
        document.getElementById("instruction").textContent =
            "Answer each question one by one";
        if (!prepareQuiz()) {
            document.getElementById("quizContent").innerHTML =
                '<div class="no-data">No questions available</div>';
            return;
        }
        renderQuiz();
    }

    document.getElementById("timer").textContent = state.timeLeft;
    state.timer = setInterval(() => {
        state.timeLeft--;
        document.getElementById("timer").textContent = state.timeLeft;

        if (state.timeLeft <= 0) endGame(false);
    }, 1000);
}

function updateScore() {
    document.getElementById("score").textContent = state.score;
}

function updateProgress() {
    const prog = document.getElementById("progress");
    let p = 0;

    if (currentGame === "matching") {
        if (state.currentTerms.length > 0) {
            p = Math.round(
                (state.matchedPairs.length / state.currentTerms.length) * 100
            );
        }
    } else if (currentGame === "filling") {
        if (state.currentFillSentences.length > 0) {
            p = Math.round(
                (state.currentSentenceIndex /
                    state.currentFillSentences.length) *
                    100
            );
        }
    } else if (currentGame === "quiz") {
        if (state.quizQuestions.length > 0) {
            p = Math.round(
                ((state.currentQuestionIndex + 1) /
                    state.quizQuestions.length) *
                    100
            );
        }
    }

    prog.textContent = `${p}%`;
}

function endGame(completed) {
    clearInterval(state.timer);

    const msg = completed
        ? `Congratulations! You completed the game.\n\nFinal Score: ${state.score}`
        : `Time's up!\n\nFinal Score: ${state.score}`;

    swal({
        title: "Game Over",
        text: msg,
        icon: completed ? "success" : "info",
        buttons: {
            retry: { text: "Play Again", value: "retry" },
        },
    }).then((val) => {
        if (val === "retry") startGame();
    });
}

document.addEventListener("DOMContentLoaded", init);

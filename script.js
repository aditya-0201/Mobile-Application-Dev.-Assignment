const KEY = {
    t: "spendwise_transactions",
    b: "spendwise_budgets",
    theme: "spendwise_theme"
};

const cats = {
    expense: [
        ["Food", "🍔"],
        ["Transport", "🚗"],
        ["Shopping", "🛍️"],
        ["Bills", "📄"],
        ["Entertainment", "🎬"],
        ["Health", "💊"],
        ["Education", "📚"],
        ["Other", "📦"]
    ],

    income: [
        ["Salary", "💼"],
        ["Freelance", "💻"],
        ["Investment", "📈"],
        ["Gift", "🎁"],
        ["Other", "💰"]
    ]
};

const colors = [
    "#2563eb",
    "#16a34a",
    "#ea580c",
    "#7c3aed",
    "#db2777",
    "#0891b2",
    "#ca8a04",
    "#64748b"
];

let transactions = JSON.parse(
    localStorage.getItem(KEY.t) || "[]"
);

let budgets = JSON.parse(
    localStorage.getItem(KEY.b) || "[]"
);


const $ = id => document.getElementById(id);

const money = n =>
    "₹" + Number(n || 0).toLocaleString("en-IN", {
        maximumFractionDigits: 2
    });

const today = () =>
    new Date().toISOString().slice(0, 10);

const dateText = d =>
    new Date(d + "T00:00:00").toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
    });


function cat(type, name) {
    return (
        (cats[type] || []).find(x => x[0] === name) ||
        [name, "📦"]
    );
}


function monthItems() {
    let n = new Date();

    return transactions.filter(t => {
        let d = new Date(t.date + "T00:00:00");

        return (
            d.getMonth() === n.getMonth() &&
            d.getFullYear() === n.getFullYear()
        );
    });
}


function save() {
    localStorage.setItem(
        KEY.t,
        JSON.stringify(transactions)
    );

    localStorage.setItem(
        KEY.b,
        JSON.stringify(budgets)
    );
}


function fillCats() {

    let type = document.querySelector(
        'input[name="kind"]:checked'
    ).value;

    $("tCategory").innerHTML =
        cats[type]
            .map(
                c => `
                    <option value="${c[0]}">
                        ${c[1]} ${c[0]}
                    </option>
                `
            )
            .join("");

    $("catFilter").innerHTML =
        '<option value="all">All Categories</option>' +
        cats.expense
            .map(
                c => `
                    <option value="${c[0]}">
                        ${c[1]} ${c[0]}
                    </option>
                `
            )
            .join("");

    $("bCategory").innerHTML =
        cats.expense
            .map(
                c => `
                    <option value="${c[0]}">
                        ${c[1]} ${c[0]}
                    </option>
                `
            )
            .join("");
}


function row(t) {

    let c = cat(t.type, t.category);

    return `
        <div class="transaction">

            <div class="ticon">
                ${c[1]}
            </div>

            <div class="tinfo">

                <b>
                    ${esc(t.title)}
                </b>

                <small>
                    ${t.category}
                    •
                    ${dateText(t.date)}
                    ${t.note ? " • " + esc(t.note) : ""}
                </small>

            </div>

            <div class="amount ${t.type}">
                ${t.type === "income" ? "+" : "-"}
                ${money(t.amount)}
            </div>

            <button
                class="delete"
                onclick="delT('${t.id}')"
            >
                🗑
            </button>

        </div>
    `;
}


function dashboard() {

    let m = monthItems();

    let inc = m
        .filter(x => x.type === "income")
        .reduce(
            (s, x) => s + +x.amount,
            0
        );

    let exp = m
        .filter(x => x.type === "expense")
        .reduce(
            (s, x) => s + +x.amount,
            0
        );

    let bal = inc - exp;

    $("balance").textContent = money(bal);
    $("income").textContent = money(inc);
    $("expense").textContent = money(exp);

    $("saving").textContent =
        (inc
            ? Math.max(
                  0,
                  Math.round((bal / inc) * 100)
              )
            : 0) + "%";


    let by = {};

    m
        .filter(x => x.type === "expense")
        .forEach(
            x =>
                (by[x.category] =
                    (by[x.category] || 0) +
                    +x.amount)
        );


    let es = Object.entries(by).sort(
        (a, b) => b[1] - a[1]
    );

    let total = es.reduce(
        (s, x) => s + x[1],
        0
    );


    $("chart").innerHTML = es.length
        ? es
              .map(
                  (x, i) => `
                    <span
                        class="segment"
                        style="
                            width:${(x[1] / total) * 100}%;
                            background:${colors[i % colors.length]}
                        "
                    ></span>
                `
              )
              .join("")
        : "";


    $("legend").innerHTML = es
        .slice(0, 6)
        .map(
            (x, i) => `
                <div class="legend-item">

                    <i
                        class="dot"
                        style="
                            background:${colors[i % colors.length]}
                        "
                    ></i>

                    ${x[0]}:
                    ${money(x[1])}

                </div>
            `
        )
        .join("");


    $("recent").innerHTML =
        [...transactions]
            .sort(
                (a, b) =>
                    new Date(b.date) -
                    new Date(a.date)
            )
            .slice(0, 5)
            .map(row)
            .join("") ||
        '<div class="empty">No transactions yet.</div>';


    budgetOverview(m);
}


function spent(c, m = monthItems()) {

    return m
        .filter(
            x =>
                x.type === "expense" &&
                x.category === c
        )
        .reduce(
            (s, x) => s + +x.amount,
            0
        );
}


function budgetHTML(b, m) {

    let s = spent(b.category, m);

    let p = Math.min(
        100,
        (s / b.limit) * 100
    );

    let state =
        p >= 100
            ? "danger"
            : p >= 80
            ? "warn"
            : "";


    return `
        <div class="budget-item">

            <div class="budget-top">

                <b>
                    ${cat("expense", b.category)[1]}
                    ${b.category}
                </b>

                <span>
                    ${Math.round(p)}%
                </span>

            </div>


            <div class="progress">

                <span
                    class="${state}"
                    style="width:${p}%"
                ></span>

            </div>

            <small>
                ${money(s)}
                of
                ${money(b.limit)}
            </small>

        </div>
    `;
}


function budgetOverview(m) {

    $("budgetOverview").innerHTML =
        budgets.length
            ? budgets
                  .slice(0, 3)
                  .map(b => budgetHTML(b, m))
                  .join("")
            : '<div class="empty">No budgets yet.</div>';
}


function renderTransactions() {

    let q =
        $("search")
            .value
            .toLowerCase();

    let ty = $("typeFilter").value;
    let ca = $("catFilter").value;
    let so = $("sort").value;


    let a = transactions.filter(t =>

        (
            !q ||
            (
                t.title +
                " " +
                t.category +
                " " +
                (t.note || "")
            )
                .toLowerCase()
                .includes(q)
        )

        &&

        (
            ty === "all" ||
            t.type === ty
        )

        &&

        (
            ca === "all" ||
            t.category === ca
        )
    );


    a.sort((x, y) => {

        if (so === "newest") {
            return (
                new Date(y.date) -
                new Date(x.date)
            );
        }

        if (so === "oldest") {
            return (
                new Date(x.date) -
                new Date(y.date)
            );
        }

        if (so === "high") {
            return y.amount - x.amount;
        }

        return x.amount - y.amount;
    });


    $("allTransactions").innerHTML =
        a.map(row).join("") ||
        '<div class="empty">No matching transactions found.</div>';
}


function renderBudgets() {

    let m = monthItems();

    $("budgetCards").innerHTML =
        budgets.length
            ? budgets
                  .map(
                      b => `
                        <article class="panel">

                            <h3>
                                ${cat("expense", b.category)[1]}
                                ${b.category}
                            </h3>

                            <small>
                                Monthly spending limit
                            </small>

                            <div class="budget-number">

                                <span>
                                    Spent:
                                    <b>
                                        ${money(
                                            spent(
                                                b.category,
                                                m
                                            )
                                        )}
                                    </b>
                                </span>

                                <span>
                                    Limit:
                                    ${money(b.limit)}
                                </span>

                            </div>

                            ${budgetHTML(b, m)}

                            <button
                                class="delete"
                                onclick="delB('${b.id}')"
                            >
                                🗑 Delete
                            </button>

                        </article>
                    `
                  )
                  .join("")
            : '<div class="panel">No budgets created yet.</div>';
}


function reports() {

    let m = monthItems();

    let inc = m
        .filter(x => x.type === "income")
        .reduce(
            (s, x) => s + +x.amount,
            0
        );

    let exp = m
        .filter(x => x.type === "expense")
        .reduce(
            (s, x) => s + +x.amount,
            0
        );


    let now = new Date();

    let arr = [];


    for (let i = 5; i >= 0; i--) {

        let d = new Date(
            now.getFullYear(),
            now.getMonth() - i,
            1
        );


        let items = transactions.filter(t => {

            let x = new Date(
                t.date + "T00:00:00"
            );

            return (
                x.getMonth() === d.getMonth() &&
                x.getFullYear() === d.getFullYear()
            );
        });


        arr.push({

            l: d.toLocaleDateString(
                "en-IN",
                {
                    month: "short"
                }
            ),

            i: items
                .filter(x => x.type === "income")
                .reduce(
                    (s, x) => s + +x.amount,
                    0
                ),

            e: items
                .filter(x => x.type === "expense")
                .reduce(
                    (s, x) => s + +x.amount,
                    0
                )
        });
    }


    let max = Math.max(
        1,
        ...arr.flatMap(x => [x.i, x.e])
    );


    $("flow").innerHTML =
        arr
            .map(
                x => `
                    <div class="month">

                        <div
                            class="bar i"
                            style="
                                height:${(x.i / max) * 100}%
                            "
                        ></div>

                        <div
                            class="bar e"
                            style="
                                height:${(x.e / max) * 100}%
                            "
                        ></div>

                        <small>
                            ${x.l}
                        </small>

                    </div>
                `
            )
            .join("");


    let by = {};

    m
        .filter(x => x.type === "expense")
        .forEach(
            x =>
                (by[x.category] =
                    (by[x.category] || 0) +
                    +x.amount)
        );


    let es = Object.entries(by).sort(
        (a, b) => b[1] - a[1]
    );

    let mx = es[0]?.[1] || 1;


    $("topCats").innerHTML =
        es.length
            ? es
                  .map(
                      x => `
                        <div class="category">

                            <span>
                                ${x[0]}
                            </span>

                            <div class="line">

                                <span
                                    style="
                                        width:${(x[1] / mx) * 100}%
                                    "
                                ></span>

                            </div>

                            <strong>
                                ${money(x[1])}
                            </strong>

                        </div>
                    `
                  )
                  .join("")
            : '<div class="empty">No expense data.</div>';


    $("summary").innerHTML = `

        <div>
            <span>Income</span>
            <strong>
                ${money(inc)}
            </strong>
        </div>

        <div>
            <span>Expenses</span>
            <strong>
                ${money(exp)}
            </strong>
        </div>

        <div>
            <span>Net Savings</span>
            <strong>
                ${money(inc - exp)}
            </strong>
        </div>

        <div>
            <span>Transactions</span>
            <strong>
                ${m.length}
            </strong>
        </div>

    `;
}


function delT(id) {

    transactions =
        transactions.filter(
            t => t.id !== id
        );

    save();
    refresh();
}


function delB(id) {

    budgets =
        budgets.filter(
            b => b.id !== id
        );

    save();
    refresh();
}


function modal(id, on = true) {

    $(id).classList.toggle(
        "open",
        on
    );
}


function show(page) {

    document
        .querySelectorAll(".page")
        .forEach(
            x =>
                x.classList.remove(
                    "active"
                )
        );


    document
        .querySelectorAll(".nav")
        .forEach(
            x =>
                x.classList.remove(
                    "active"
                )
        );


    $(page).classList.add("active");


    document
        .querySelectorAll(
            `[data-page="${page}"]`
        )
        .forEach(
            x =>
                x.classList.add(
                    "active"
                )
        );


    $("title").textContent = {
        dashboard: "Dashboard",
        transactions: "Transactions",
        budgets: "Budgets",
        reports: "Reports & Analytics"
    }[page];


    if (page === "transactions") {
        renderTransactions();
    }

    if (page === "budgets") {
        renderBudgets();
    }

    if (page === "reports") {
        reports();
    }
}


function refresh() {

    dashboard();
    renderTransactions();
    renderBudgets();
    reports();
}


function esc(v) {

    return String(v)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


document
    .querySelectorAll(".nav")
    .forEach(
        x =>
            x.addEventListener(
                "click",
                () =>
                    show(x.dataset.page)
            )
    );


document
    .querySelectorAll("[data-go]")
    .forEach(
        x =>
            x.addEventListener(
                "click",
                () =>
                    show(x.dataset.go)
            )
    );


[
    "quickAdd",
    "heroAdd",
    "transactionAdd"
].forEach(id => {

    $(id).addEventListener(
        "click",
        () =>
            modal("transactionModal")
    );

});


$("budgetAdd").addEventListener(
    "click",
    () =>
        modal("budgetModal")
);


document
    .querySelectorAll("[data-close]")
    .forEach(
        x =>
            x.addEventListener(
                "click",
                () =>
                    modal(
                        x.dataset.close,
                        false
                    )
            )
    );


document
    .querySelectorAll(".modal")
    .forEach(
        x =>
            x.addEventListener(
                "click",
                e => {

                    if (e.target === x) {
                        x.classList.remove(
                            "open"
                        );
                    }

                }
            )
    );


document
    .querySelectorAll(
        'input[name="kind"]'
    )
    .forEach(
        x =>
            x.addEventListener(
                "change",
                fillCats
            )
    );


[
    "search",
    "typeFilter",
    "catFilter",
    "sort"
].forEach(id => {

    $(id).addEventListener(
        "input",
        renderTransactions
    );

});


$("transactionForm").addEventListener(
    "submit",
    e => {

        e.preventDefault();


        let type =
            document.querySelector(
                'input[name="kind"]:checked'
            ).value;


        transactions.push({

            id: Date.now().toString(),

            type,

            title:
                $("tTitle")
                    .value
                    .trim(),

            amount:
                +$("tAmount").value,

            category:
                $("tCategory").value,

            date:
                $("tDate").value,

            note:
                $("tNote")
                    .value
                    .trim()
        });


        save();

        e.target.reset();

        $("tDate").value = today();

        fillCats();

        modal(
            "transactionModal",
            false
        );

        refresh();
    }
);


$("budgetForm").addEventListener(
    "submit",
    e => {

        e.preventDefault();


        let c =
            $("bCategory").value;


        let old =
            budgets.find(
                x => x.category === c
            );


        if (old) {

            old.limit =
                +$("bLimit").value;

        } else {

            budgets.push({

                id:
                    Date.now().toString(),

                category: c,

                limit:
                    +$("bLimit").value
            });
        }


        save();

        e.target.reset();

        modal(
            "budgetModal",
            false
        );

        refresh();
    }
);


$("theme").addEventListener(
    "click",
    () => {

        document.body.classList.toggle(
            "dark"
        );


        let d =
            document.body.classList.contains(
                "dark"
            );


        localStorage.setItem(
            KEY.theme,
            d ? "dark" : "light"
        );


        $("theme").textContent =
            d
                ? "☀️ Light Mode"
                : "🌙 Dark Mode";
    }
);


function seed() {

    if (
        transactions.length ||
        budgets.length
    ) {
        return;
    }


    transactions = [

        {
            id: "1",
            type: "income",
            title: "Monthly Salary",
            amount: 45000,
            category: "Salary",
            date: today(),
            note: "Main income"
        },

        {
            id: "2",
            type: "expense",
            title: "Grocery Shopping",
            amount: 2800,
            category: "Food",
            date: today(),
            note: "Weekly groceries"
        },

        {
            id: "3",
            type: "expense",
            title: "Metro Recharge",
            amount: 900,
            category: "Transport",
            date: today(),
            note: ""
        },

        {
            id: "4",
            type: "expense",
            title: "Online Course",
            amount: 1800,
            category: "Education",
            date: today(),
            note: "Programming course"
        },

        {
            id: "5",
            type: "expense",
            title: "Movie Night",
            amount: 700,
            category: "Entertainment",
            date: today(),
            note: ""
        }
    ];


    budgets = [

        {
            id: "b1",
            category: "Food",
            limit: 6000
        },

        {
            id: "b2",
            category: "Transport",
            limit: 3000
        },

        {
            id: "b3",
            category: "Entertainment",
            limit: 2500
        }
    ];


    save();
}


seed();


if (
    localStorage.getItem(KEY.theme) ===
    "dark"
) {

    $("theme").textContent =
        "☀️ Light Mode";

    document.body.classList.add(
        "dark"
    );
}


$("tDate").value = today();

fillCats();

refresh();
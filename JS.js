document.addEventListener('DOMContentLoaded', () => {
    // 1. Санҷиши ворид шудан (Агар корбар логин накарда бошад, мепартояд ба саҳифаи логин)
    if (!localStorage.getItem('sp_is_logged_in')) {
        window.location.href = 'login.html'; // ё auth.html
        return;
    }

    // 2. Идоракунии профил ва номи корбар
    let userProfile = JSON.parse(localStorage.getItem('sp_profile')) || { name: 'User' };

    function renderProfile() {
        const nameDisplay = $('#userNameDisplay');
        const avatar = $('#avatarLetter');
        const greeting = $('#greetingText');

        if (nameDisplay) nameDisplay.textContent = userProfile.name;
        if (avatar) avatar.textContent = userProfile.name.charAt(0).toUpperCase();
        if (greeting) greeting.textContent = `Привет, ${userProfile.name}! 👋`;
    }

    renderProfile();

    // 3. Таърихи сана ва сол дар саҳифа
    const todayDateEl = $("#todayDate");
    if (todayDateEl) {
        todayDateEl.textContent = new Date().toLocaleDateString(undefined, {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    }

    const yearEl = $("#year");
    if (yearEl) {
        yearEl.textContent = new Date().getFullYear();
    }

    // 4. Логикаи Вазифаҳо (Tasks)
    const $ = (selector) => document.querySelector(selector);

    const taskList = $("#taskList");
    const taskForm = $("#taskForm");
    const taskFormWrap = $("#taskFormWrap");
    const taskTitle = $("#taskTitle");
    const taskDate = $("#taskDate");
    const taskPriority = $("#taskPriority");
    const emptyMessage = $("#emptyMessage");

    let currentFilter = "all";
    let searchQuery = "";
    let tasks = loadTasks();

    function loadTasks() {
        try {
            const saved = localStorage.getItem("studyplan_tasks");
            const parsed = saved ? JSON.parse(saved) : [];
            return Array.isArray(parsed) ? parsed.filter(
                task => task &&
                    typeof task.id === "string" &&
                    typeof task.title === "string" &&
                    typeof task.completed === "boolean" &&
                    ["Low", "Medium", "High"].includes(task.priority)
            ) : [];
        } catch {
            return [];
        }
    }

    function saveTasks() {
        try {
            localStorage.setItem("studyplan_tasks", JSON.stringify(tasks));
        } catch {
            alert("Could not save tasks in this browser.");
        }
    }

    function escapeHTML(value) {
        return String(value).replace(/[&<>"']/g, character => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[character]);
    }

    function formatDate(dateString) {
        if (!dateString) return "No deadline";
        const date = new Date(dateString + "T12:00:00");
        return date.toLocaleDateString(undefined, {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    }

    function renderTasks() {
        if (!taskList) return;
        const filteredTasks = tasks.filter(task => {
            const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter =
                currentFilter === "all" ||
                (currentFilter === "active" && !task.completed) ||
                (currentFilter === "completed" && task.completed);
            return matchesSearch && matchesFilter;
        });

        taskList.innerHTML = filteredTasks.map(task => `
            <article class="task-row ${task.completed ? "completed" : ""}">
                <input
                    class="task-checkbox"
                    type="checkbox"
                    data-action="toggle"
                    data-id="${escapeHTML(task.id)}"
                    aria-label="Mark ${escapeHTML(task.title)} as completed"
                    ${task.completed ? "checked" : ""}
                >
                <div class="task-info">
                    <div class="task-title">${escapeHTML(task.title)}</div>
                    <div class="task-meta">${escapeHTML(formatDate(task.date))}</div>
                </div>
                <span class="priority ${task.priority}">
                    ${escapeHTML(task.priority)}
                </span>
                <button
                    class="delete-btn"
                    type="button"
                    data-action="delete"
                    data-id="${escapeHTML(task.id)}"
                    aria-label="Delete ${escapeHTML(task.title)}"
                    title="Delete task"
                >×</button>
            </article>
        `).join("");

        if (emptyMessage) {
            emptyMessage.classList.toggle("hidden", filteredTasks.length !== 0);
        }

        updateProgress();
    }

    function updateProgress() {
        const completed = tasks.filter(task => task.completed).length;
        const total = tasks.length;
        const percentage = total === 0 ? 0 : Math.round(completed / total * 100);

        const todayCountEl = $("#todayCount");
        if (todayCountEl) todayCountEl.textContent = tasks.filter(task => !task.completed).length;

        const progressNumEl = $("#progressNumber");
        if (progressNumEl) progressNumEl.textContent = percentage + "%";

        const progressBarEl = $("#progressBar");
        if (progressBarEl) progressBarEl.style.width = percentage + "%";

        const progressTextEl = $("#progressText");
        if (progressTextEl) progressTextEl.textContent = `${completed} of ${total} tasks completed`;
    }

    function openTaskForm() {
        if (taskFormWrap) taskFormWrap.classList.remove("hidden");
        if (taskTitle) taskTitle.focus();
    }

    function closeTaskForm() {
        if (taskForm) taskForm.reset();
        if (taskFormWrap) taskFormWrap.classList.add("hidden");
    }

    if ($("#addTaskBtn")) $("#addTaskBtn").addEventListener("click", openTaskForm);
    if ($("#quickAddBtn")) $("#quickAddBtn").addEventListener("click", openTaskForm);
    if ($("#cancelTaskBtn")) $("#cancelTaskBtn").addEventListener("click", closeTaskForm);

    if (taskForm) {
        taskForm.addEventListener("submit", event => {
            event.preventDefault();
            const title = taskTitle.value.trim();
            if (!title) {
                taskTitle.focus();
                return;
            }

            tasks.unshift({
                id: crypto.randomUUID(),
                title,
                date: taskDate.value,
                priority: taskPriority.value,
                completed: false
            });

            saveTasks();
            closeTaskForm();
            renderTasks();
        });
    }

    if (taskList) {
        taskList.addEventListener("change", event => {
            const checkbox = event.target.closest('[data-action="toggle"]');
            if (!checkbox) return;
            const task = tasks.find(item => item.id === checkbox.dataset.id);
            if (!task) return;

            task.completed = checkbox.checked;
            saveTasks();
            renderTasks();
        });

        taskList.addEventListener("click", event => {
            const button = event.target.closest('[data-action="delete"]');
            if (!button) return;
            tasks = tasks.filter(item => item.id !== button.dataset.id);
            saveTasks();
            renderTasks();
        });
    }

    document.querySelectorAll(".filter-btn").forEach(button => {
        button.addEventListener("click", () => {
            currentFilter = button.dataset.filter;
            document.querySelectorAll(".filter-btn").forEach(item => {
                item.classList.toggle("active", item === button);
            });
            renderTasks();
        });
    });

    if ($("#searchInput")) {
        $("#searchInput").addEventListener("input", event => {
            searchQuery = event.target.value;
            renderTasks();
        });
    }

    // 5. Логикаи Календар
    let calendarDate = new Date();

    function renderCalendar() {
        const monthLabel = $("#monthLabel");
        if (!monthLabel) return;

        const year = calendarDate.getFullYear();
        const month = calendarDate.getMonth();

        monthLabel.textContent = calendarDate.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric"
        });

        const firstDay = new Date(year, month, 1);
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const offset = (firstDay.getDay() + 6) % 7;

        const today = new Date();
        const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

        let html = "";
        for (let i = 0; i < offset; i++) {
            html += '<span class="calendar-day blank"></span>';
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = isCurrentMonth && today.getDate() === day;
            html += `<span class="calendar-day ${isToday ? "today" : ""}">${day}</span>`;
        }

        const calendarDaysEl = $("#calendarDays");
        if (calendarDaysEl) calendarDaysEl.innerHTML = html;
    }

    if ($("#prevMonth")) {
        $("#prevMonth").addEventListener("click", () => {
            calendarDate.setMonth(calendarDate.getMonth() - 1);
            renderCalendar();
        });
    }

    if ($("#nextMonth")) {
        $("#nextMonth").addEventListener("click", () => {
            calendarDate.setMonth(calendarDate.getMonth() + 1);
            renderCalendar();
        });
    }

    renderCalendar();
    renderTasks();
});
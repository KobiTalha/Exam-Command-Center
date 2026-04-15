import { emptyState, escapeHtml } from "../utils.js";

function optionMarkup(courses, selectedId) {
  const options = [`<option value="all">All courses</option>`];

  courses.forEach((course) => {
    options.push(
      `<option value="${course.id}" ${String(course.id) === String(selectedId) ? "selected" : ""}>
        ${escapeHtml(course.code)} · ${escapeHtml(course.name)}
      </option>`
    );
  });

  return options.join("");
}

export function renderFlashcards(state, refs) {
  refs.flashcardCourseFilter.innerHTML = optionMarkup(state.courses, state.flashcards.courseId);

  const selectedCourse =
    state.flashcards.courseId === "all"
      ? null
      : state.courses.find((course) => String(course.id) === String(state.flashcards.courseId));
  const currentCard = state.flashcards.queue[state.flashcards.index];

  refs.flashcardCourseLabel.textContent = selectedCourse
    ? `${selectedCourse.code} · ${selectedCourse.name}`
    : "All course queues";
  refs.flashcardCounter.textContent = currentCard
    ? `Card ${state.flashcards.index + 1} of ${state.flashcards.queue.length}`
    : "Card 0 of 0";
  refs.flashcardQueueStatus.textContent = currentCard
    ? `${state.flashcards.queue.length} queued`
    : "Queue empty";

  refs.flashcardStage.innerHTML = currentCard
    ? `
      <div class="flashcard-shell">
        <div class="flashcard-card ${state.flashcards.flipped ? "is-flipped" : ""}" data-action="flashcard-flip">
          <div class="flashcard-card-inner">
            <div class="flashcard-face flashcard-front">
              <div>
                <p class="eyebrow">${escapeHtml(currentCard.course_code)} · ${escapeHtml(currentCard.course_name)}</p>
                <div class="flashcard-question">${escapeHtml(currentCard.question)}</div>
              </div>
              <div class="flashcard-support">Tap the card to reveal the answer and review guidance.</div>
            </div>

            <div class="flashcard-face flashcard-back">
              <div>
                <p class="eyebrow">Suggested answer</p>
                <div class="flashcard-answer">${escapeHtml(currentCard.answer)}</div>
              </div>
              <div class="flashcard-support">
                Current difficulty: ${escapeHtml(currentCard.difficulty)} · Next review: ${escapeHtml(currentCard.next_review || "Not set")}
              </div>
            </div>
          </div>
        </div>

        <div class="flashcard-navigation">
          <button class="ghost-button compact-button" data-action="flashcard-prev">Previous</button>
          <button class="ghost-button compact-button" data-action="flashcard-next">Next</button>
        </div>

        <div class="review-actions">
          <button class="review-button" data-action="flashcard-review" data-difficulty="hard">Hard</button>
          <button class="review-button" data-action="flashcard-review" data-difficulty="good">Good</button>
          <button class="review-button" data-action="flashcard-review" data-difficulty="easy">Easy</button>
        </div>
      </div>
    `
    : emptyState("No flashcards are queued for this filter. Try another course or reload the queue.");

  refs.flashcardDeckList.innerHTML = state.flashcards.summaries.length
    ? state.flashcards.summaries
        .map((deck) => {
          const isActive =
            state.flashcards.courseId !== "all" &&
            String(deck.course_id) === String(state.flashcards.courseId);

          return `
            <article class="deck-row ${isActive ? "is-active" : ""}" data-action="flashcard-select-course" data-course-id="${deck.course_id}">
              <div class="deck-row-head">
                <div>
                  <h4>${escapeHtml(deck.code)} · ${escapeHtml(deck.name)}</h4>
                  <div class="deck-meta">
                    <span>${Number(deck.total_cards)} cards</span>
                    <span>${escapeHtml(deck.type)}</span>
                  </div>
                </div>
                <span class="pill ${Number(deck.due_cards) > 0 ? "high" : "low"}">${Number(deck.due_cards)} due</span>
              </div>
              <div class="deck-meta">
                <span>Easy ${Number(deck.easy_cards)}</span>
                <span>Medium ${Number(deck.medium_cards)}</span>
                <span>Hard ${Number(deck.hard_cards)}</span>
              </div>
            </article>
          `;
        })
        .join("")
    : emptyState("Flashcard decks will appear after the database import finishes.");
}

const EMPTY_FILTERS = { q: '', completed: '', priority: '', categoryId: '' };

export default function TaskFilters({ filters, categories, onChange }) {
  function handleFieldChange(event) {
    const { name, value } = event.target;
    onChange({ ...filters, [name]: value });
  }

  return (
    <section aria-label="Фильтры">
      <h2>Фильтры</h2>
      <div>
        <label htmlFor="filter-q">
          Поиск по названию
          <input
            id="filter-q"
            name="q"
            type="search"
            value={filters.q}
            onChange={handleFieldChange}
            placeholder="Фрагмент названия"
          />
        </label>

        <label htmlFor="filter-completed">
          Статус
          <select
            id="filter-completed"
            name="completed"
            value={filters.completed}
            onChange={handleFieldChange}
          >
            <option value="">Все</option>
            <option value="false">В работе</option>
            <option value="true">Выполненные</option>
          </select>
        </label>

        <label htmlFor="filter-priority">
          Приоритет
          <select
            id="filter-priority"
            name="priority"
            value={filters.priority}
            onChange={handleFieldChange}
          >
            <option value="">Все</option>
            <option value="low">Низкий</option>
            <option value="medium">Средний</option>
            <option value="high">Высокий</option>
          </select>
        </label>

        <label htmlFor="filter-category">
          Категория
          <select
            id="filter-category"
            name="categoryId"
            value={filters.categoryId}
            onChange={handleFieldChange}
          >
            <option value="">Все</option>
            {categories.map(category => (
              <option key={category.id} value={String(category.id)}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="actions">
        <button type="button" onClick={() => onChange({ ...EMPTY_FILTERS })}>
          Сбросить фильтры
        </button>
      </div>
    </section>
  );
}
function CategoryPicker({ categories, selectedCategory, setSelectedCategory, disabled = false }) {
  return (
    <div className="category-picker" role="group" aria-labelledby="category-picker-label">
      <h3 id="category-picker-label">What type of care was provided?</h3>
      <div className="category-grid">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-btn ${selectedCategory === category.id ? 'selected' : ''}`}
            onClick={() => !disabled && setSelectedCategory(category.id)}
            disabled={disabled}
            title={category.description}
            aria-label={`${category.name}: ${category.description}`}
            aria-pressed={selectedCategory === category.id}
          >
            <span className="category-emoji" aria-hidden="true">{category.emoji}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CategoryPicker;

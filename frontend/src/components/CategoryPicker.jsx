function CategoryPicker({ categories, selectedCategory, setSelectedCategory, disabled = false }) {
  return (
    <div className="category-picker">
      <h3>What kind of IT magic was performed?</h3>
      <div className="category-grid">
        {categories.map((category) => (
          <button
            key={category.id}
            type="button"
            className={`category-btn ${selectedCategory === category.id ? 'selected' : ''}`}
            onClick={() => !disabled && setSelectedCategory(category.id)}
            disabled={disabled}
            title={category.description}
          >
            <span className="category-emoji">{category.emoji}</span>
            <span className="category-name">{category.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CategoryPicker;

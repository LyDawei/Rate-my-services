import { useState } from 'react';
import PropTypes from 'prop-types';

// Baymax tooltips for each category
const CATEGORY_TOOLTIPS = {
  feature_building: "I detect a need for new capabilities.",
  bug_fixing: "I will diagnose and treat this technical ailment.",
  integration: "Connecting systems for optimal health.",
  it_assistance: "General wellness checkup for your technology."
};

// Animation classes for each category emoji
const CATEGORY_ANIMATIONS = {
  feature_building: 'rocket-float',
  bug_fixing: 'bug-wiggle',
  integration: 'link-pulse',
  it_assistance: 'computer-spin'
};

function CategoryPicker({ categories, selectedCategory, setSelectedCategory, disabled = false }) {
  const [hoveredCategory, setHoveredCategory] = useState(null);
  const [justSelected, setJustSelected] = useState(null);

  const handleSelect = (categoryId) => {
    if (disabled) return;
    setSelectedCategory(categoryId);
    setJustSelected(categoryId);
    setTimeout(() => setJustSelected(null), 400);
  };

  return (
    <div className="category-picker" role="group" aria-labelledby="category-picker-label">
      <h3 id="category-picker-label">What type of care was provided?</h3>
      <div className="category-grid">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.id;
          const isHovered = hoveredCategory === category.id;
          const isJustSelected = justSelected === category.id;
          const animationClass = CATEGORY_ANIMATIONS[category.id] || '';
          const tooltip = CATEGORY_TOOLTIPS[category.id] || category.description;

          return (
            <button
              key={category.id}
              type="button"
              className={`category-btn ${isSelected ? 'selected' : ''} ${isJustSelected ? 'just-selected' : ''}`}
              onClick={() => handleSelect(category.id)}
              onMouseEnter={() => !disabled && setHoveredCategory(category.id)}
              onMouseLeave={() => setHoveredCategory(null)}
              disabled={disabled}
              title={tooltip}
              aria-label={`${category.name}: ${tooltip}`}
              aria-pressed={isSelected}
            >
              <span
                className={`category-emoji ${isHovered ? animationClass : ''}`}
                aria-hidden="true"
              >
                {category.emoji}
              </span>
              <span className="category-name">{category.name}</span>
              {isSelected && (
                <span className="category-check" aria-hidden="true">✓</span>
              )}
              {isJustSelected && (
                <span className="selection-ring" aria-hidden="true" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

CategoryPicker.propTypes = {
  categories: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.string.isRequired,
    name: PropTypes.string.isRequired,
    emoji: PropTypes.string.isRequired,
    description: PropTypes.string
  })).isRequired,
  selectedCategory: PropTypes.string,
  setSelectedCategory: PropTypes.func.isRequired,
  disabled: PropTypes.bool
};

export default CategoryPicker;

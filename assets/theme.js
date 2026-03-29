// Varkomz Theme JS — minimal, no dependencies

document.addEventListener('DOMContentLoaded', function() {

  // === VARIANT SELECTOR ===
  const variantSelects = document.querySelectorAll('.variant-select');
  if (variantSelects.length > 0) {
    variantSelects.forEach(function(select) {
      select.addEventListener('change', function() {
        updateVariant();
      });
    });
  }

  function updateVariant() {
    const form = document.querySelector('form[action="/cart/add"]');
    if (!form) return;
    const selects = form.querySelectorAll('.variant-select');
    const values = Array.from(selects).map(s => s.value);
    // Could add AJAX variant lookup here
    console.log('Variant selected:', values.join(' / '));
  }

  // === MOBILE MENU TOGGLE ===
  const menuToggle = document.querySelector('.mobile-menu-toggle');
  const navList = document.querySelector('.nav-list');
  if (menuToggle && navList) {
    menuToggle.addEventListener('click', function() {
      navList.classList.toggle('nav-open');
      menuToggle.setAttribute('aria-expanded', navList.classList.contains('nav-open'));
    });
  }

  // === CART QUANTITY UPDATE ===
  const cartForm = document.querySelector('form[action="/cart"]');
  if (cartForm) {
    const updateBtn = cartForm.querySelector('[name="update"]');
    if (updateBtn) {
      updateBtn.addEventListener('click', function(e) {
        // Cart form submits normally — extend here for AJAX if needed
      });
    }
  }

  // === SHOPIFY SECTION EVENTS (for customizer live preview) ===
  document.addEventListener('shopify:section:load', function(event) {
    console.log('Section loaded:', event.detail.sectionId);
  });

  document.addEventListener('shopify:section:select', function(event) {
    const section = document.getElementById('shopify-section-' + event.detail.sectionId);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

});

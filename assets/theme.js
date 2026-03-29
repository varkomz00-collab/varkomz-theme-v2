// Varkomz Theme JS — minimal, no dependencies

document.addEventListener('DOMContentLoaded', function() {

  // === VARIANT SELECTOR ===
  (function() {
    var form = document.querySelector('form[action="/cart/add"]');
    if (!form) return;
    var selects = form.querySelectorAll('.variant-select');
    if (!selects.length) return;

    var idInput = form.querySelector('input[name="id"]');
    var priceEl = document.querySelector('.product-current-price');
    var compareEl = document.querySelector('.product-compare-price');
    var addBtn = form.querySelector('.add-to-cart');

    // Parse variants JSON from the page
    var variantsScript = document.querySelector('[id^="ProductVariants-"]');
    var variants = [];
    if (variantsScript) {
      try { variants = JSON.parse(variantsScript.textContent); } catch(e) {}
    }

    function updateVariant() {
      var selectedOptions = Array.from(selects).map(function(s) { return s.value; });
      var match = variants.find(function(v) {
        return v.options.every(function(opt, i) {
          return opt === selectedOptions[i];
        });
      });

      if (match && idInput) {
        idInput.value = match.id;

        // Update price display
        if (priceEl) {
          priceEl.textContent = formatMoney(match.price);
        }
        if (compareEl) {
          if (match.compare_at_price && match.compare_at_price > match.price) {
            compareEl.textContent = formatMoney(match.compare_at_price);
            compareEl.style.display = '';
          } else {
            compareEl.style.display = 'none';
          }
        }

        // Update availability
        if (addBtn) {
          if (match.available) {
            addBtn.disabled = false;
            addBtn.textContent = 'Add to Cart';
          } else {
            addBtn.disabled = true;
            addBtn.textContent = 'Sold Out';
          }
        }
      }
    }

    selects.forEach(function(select) {
      select.addEventListener('change', updateVariant);
    });
  })();

  function formatMoney(cents) {
    return (Shopify && Shopify.formatMoney)
      ? Shopify.formatMoney(cents)
      : '$' + (cents / 100).toFixed(2);
  }


  // === MOBILE MENU TOGGLE ===
  (function() {
    var menuToggle = document.querySelector('.mobile-menu-toggle');
    var mobileNav = document.getElementById('MobileNav');
    if (!menuToggle || !mobileNav) return;

    var hamburger = menuToggle.querySelector('.icon-hamburger');
    var closeIcon = menuToggle.querySelector('.icon-close');

    menuToggle.addEventListener('click', function() {
      var isOpen = mobileNav.classList.toggle('mobile-nav--open');
      mobileNav.setAttribute('aria-hidden', !isOpen);
      menuToggle.setAttribute('aria-expanded', isOpen);
      document.body.classList.toggle('mobile-nav-active', isOpen);

      if (hamburger && closeIcon) {
        hamburger.style.display = isOpen ? 'none' : '';
        closeIcon.style.display = isOpen ? '' : 'none';
      }
    });
  })();


  // === CART DRAWER (AJAX) ===
  (function() {
    var overlay = document.querySelector('.cart-drawer-overlay');
    var drawer = document.querySelector('.cart-drawer');
    if (!overlay || !drawer) return;

    var closeBtn = drawer.querySelector('.cart-drawer-close');
    var itemsContainer = drawer.querySelector('.cart-drawer-items');
    var totalEl = drawer.querySelector('.cart-drawer-total-price');
    var checkoutBtn = drawer.querySelector('.cart-drawer-checkout');
    var cartCountEls = document.querySelectorAll('.cart-count');

    function openDrawer() {
      overlay.classList.add('active');
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
      refreshCart();
    }

    function closeDrawer() {
      overlay.classList.remove('active');
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }

    overlay.addEventListener('click', closeDrawer);
    if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

    // Close on Escape
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && drawer.classList.contains('active')) closeDrawer();
    });

    function refreshCart() {
      fetch('/cart.js')
        .then(function(r) { return r.json(); })
        .then(function(cart) {
          renderCartItems(cart);
          updateCartCount(cart.item_count);
        });
    }

    function renderCartItems(cart) {
      if (!itemsContainer) return;
      if (cart.items.length === 0) {
        itemsContainer.innerHTML = '<p style="text-align:center;color:var(--vz-gray);padding:2rem 0;">Your cart is empty</p>';
        if (totalEl) totalEl.textContent = formatMoney(0);
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
      }

      if (checkoutBtn) checkoutBtn.style.display = '';
      itemsContainer.innerHTML = cart.items.map(function(item) {
        var img = item.image ? item.image.replace(/(\.[^.]+)$/, '_180x$1') : '';
        return '<div class="cart-drawer-item" data-key="' + item.key + '">' +
          (img ? '<img src="' + img + '" alt="' + item.title + '" width="72" height="72">' : '') +
          '<div style="flex:1">' +
            '<p style="font-weight:600;margin:0 0 4px">' + item.product_title + '</p>' +
            (item.variant_title ? '<p style="font-size:13px;color:var(--vz-gray);margin:0 0 4px">' + item.variant_title + '</p>' : '') +
            '<p style="margin:0">' + formatMoney(item.final_line_price) + '</p>' +
            '<div style="display:flex;align-items:center;gap:8px;margin-top:8px">' +
              '<button class="cart-qty-btn" data-key="' + item.key + '" data-qty="' + (item.quantity - 1) + '" aria-label="Decrease quantity">&minus;</button>' +
              '<span>' + item.quantity + '</span>' +
              '<button class="cart-qty-btn" data-key="' + item.key + '" data-qty="' + (item.quantity + 1) + '" aria-label="Increase quantity">+</button>' +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      if (totalEl) totalEl.textContent = formatMoney(cart.total_price);

      // Attach quantity change listeners
      itemsContainer.querySelectorAll('.cart-qty-btn').forEach(function(btn) {
        btn.addEventListener('click', function() {
          changeQuantity(btn.dataset.key, parseInt(btn.dataset.qty, 10));
        });
      });
    }

    function changeQuantity(key, qty) {
      fetch('/cart/change.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: key, quantity: qty })
      })
        .then(function(r) { return r.json(); })
        .then(function(cart) {
          renderCartItems(cart);
          updateCartCount(cart.item_count);
        });
    }

    function updateCartCount(count) {
      cartCountEls.forEach(function(el) {
        el.textContent = count;
        el.style.display = count > 0 ? '' : 'none';
      });
    }

    // Intercept add-to-cart forms
    document.addEventListener('submit', function(e) {
      var form = e.target.closest('form[action="/cart/add"]');
      if (!form) return;
      e.preventDefault();

      var formData = new FormData(form);
      fetch('/cart/add.js', {
        method: 'POST',
        body: formData
      })
        .then(function(r) { return r.json(); })
        .then(function() { openDrawer(); })
        .catch(function(err) {
          console.error('Add to cart failed:', err);
          form.submit(); // Fallback to normal submit
        });
    });

    // Open drawer when header cart icon is clicked
    var cartLink = document.querySelector('.header-cart');
    if (cartLink) {
      cartLink.addEventListener('click', function(e) {
        e.preventDefault();
        openDrawer();
      });
    }
  })();


  // === NEWSLETTER POPUP ===
  (function() {
    var popup = document.getElementById('NewsletterPopup');
    if (!popup) return;

    var closeBtn = popup.querySelector('.newsletter-popup-close');
    var overlay = popup.querySelector('.newsletter-popup-overlay');
    var form = popup.querySelector('form');
    var COOKIE_NAME = 'vz_newsletter_dismissed';
    var DISMISS_DAYS = 30;

    function getCookie(name) {
      var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
      return match ? match[2] : null;
    }

    function setCookie(name, value, days) {
      var d = new Date();
      d.setTime(d.getTime() + (days * 86400000));
      document.cookie = name + '=' + value + ';expires=' + d.toUTCString() + ';path=/;SameSite=Lax';
    }

    // Don't show if dismissed within DISMISS_DAYS
    if (getCookie(COOKIE_NAME)) return;

    // Show after delay
    var delay = parseInt(popup.dataset.delay || '5000', 10);
    setTimeout(function() {
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
    }, delay);

    function closePopup() {
      popup.classList.remove('active');
      document.body.style.overflow = '';
      setCookie(COOKIE_NAME, '1', DISMISS_DAYS);
    }

    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (overlay) overlay.addEventListener('click', closePopup);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && popup.classList.contains('active')) closePopup();
    });

    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var email = form.querySelector('input[type="email"]').value;
        if (!email) return;

        // Post to Shopify customer API
        fetch('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: 'form_type=customer&utf8=%E2%9C%93&contact%5Bemail%5D=' + encodeURIComponent(email) + '&contact%5Btags%5D=newsletter'
        }).then(function() {
          form.innerHTML = '<p style="text-align:center;font-size:18px;font-weight:600;">Welcome aboard! Check your inbox.</p>';
          setTimeout(closePopup, 2500);
        }).catch(function() {
          form.submit(); // Fallback
        });
      });
    }
  })();


  // === SHOPIFY SECTION EVENTS (for customizer live preview) ===
  document.addEventListener('shopify:section:load', function() {
    // Re-initialize any section-specific JS here if needed
  });

  document.addEventListener('shopify:section:select', function(event) {
    var section = document.getElementById('shopify-section-' + event.detail.sectionId);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

});

// Varkomz Theme JS — minimal, no dependencies

document.addEventListener('DOMContentLoaded', function() {

  // === UTILITY: HTML escape to prevent XSS ===
  function esc(str) {
    if (!str) return '';
    var d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // === UTILITY: Format money using Liquid-injected format ===
  function formatMoney(cents) {
    if (typeof cents !== 'number') cents = parseInt(cents, 10) || 0;
    var moneyFormat = window.theme && window.theme.moneyFormat
      ? window.theme.moneyFormat
      : '{{ amount }}';
    var amount = (cents / 100).toFixed(2);
    var amountNoDecimals = Math.round(cents / 100).toString();
    var amountWithComma = amount.replace('.', ',');
    return moneyFormat
      .replace('{{ amount_with_comma_separator }}', amountWithComma)
      .replace('{{ amount_no_decimals }}', amountNoDecimals)
      .replace('{{ amount_no_decimals_with_comma_separator }}', amountNoDecimals)
      .replace('{{ amount }}', amount);
  }

  // === TRANSLATED STRINGS ===
  var strings = (window.theme && window.theme.strings) || {};
  var strAddToCart = strings.addToCart || 'Add to Cart';
  var strSoldOut = strings.soldOut || 'Sold Out';


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

        if (priceEl) priceEl.textContent = formatMoney(match.price);
        if (compareEl) {
          if (match.compare_at_price && match.compare_at_price > match.price) {
            compareEl.textContent = formatMoney(match.compare_at_price);
            compareEl.style.display = '';
          } else {
            compareEl.style.display = 'none';
          }
        }

        if (addBtn) {
          if (match.available) {
            addBtn.disabled = false;
            addBtn.textContent = strAddToCart;
          } else {
            addBtn.disabled = true;
            addBtn.textContent = strSoldOut;
          }
        }
      }
    }

    selects.forEach(function(select) {
      select.addEventListener('change', updateVariant);
    });
  })();


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


  // === PRODUCT IMAGE GALLERY ===
  (function() {
    var mediaItems = document.querySelectorAll('.product-media-item');
    if (mediaItems.length <= 1) return;

    // Create thumbnail nav
    var mediaContainer = document.querySelector('.product-media');
    if (!mediaContainer) return;

    var thumbNav = document.createElement('div');
    thumbNav.className = 'product-thumbnails';

    mediaItems.forEach(function(item, index) {
      var img = item.querySelector('img');
      if (!img) return;

      var thumb = document.createElement('button');
      thumb.className = 'product-thumbnail' + (index === 0 ? ' active' : '');
      thumb.setAttribute('aria-label', 'View image ' + (index + 1));
      thumb.innerHTML = '<img src="' + esc(img.src.replace(/width=\d+/, 'width=100')) + '" alt="" width="80" height="80">';

      thumb.addEventListener('click', function() {
        mediaItems.forEach(function(m) { m.classList.remove('active'); });
        thumbNav.querySelectorAll('.product-thumbnail').forEach(function(t) { t.classList.remove('active'); });
        item.classList.add('active');
        thumb.classList.add('active');
      });

      thumbNav.appendChild(thumb);
    });

    mediaContainer.appendChild(thumbNav);
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

      // Build cart items safely (XSS-safe: all user strings escaped)
      itemsContainer.innerHTML = '';
      cart.items.forEach(function(item) {
        var row = document.createElement('div');
        row.className = 'cart-drawer-item';
        row.dataset.key = item.key;

        if (item.image) {
          var img = document.createElement('img');
          img.src = item.image.replace(/(\.[^.]+)$/, '_180x$1');
          img.alt = item.title;
          img.width = 72;
          img.height = 72;
          row.appendChild(img);
        }

        var info = document.createElement('div');
        info.style.flex = '1';

        var title = document.createElement('p');
        title.style.cssText = 'font-weight:600;margin:0 0 4px';
        title.textContent = item.product_title;
        info.appendChild(title);

        if (item.variant_title) {
          var variant = document.createElement('p');
          variant.style.cssText = 'font-size:13px;color:var(--vz-gray);margin:0 0 4px';
          variant.textContent = item.variant_title;
          info.appendChild(variant);
        }

        var price = document.createElement('p');
        price.style.margin = '0';
        price.textContent = formatMoney(item.final_line_price);
        info.appendChild(price);

        var qtyWrap = document.createElement('div');
        qtyWrap.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:8px';

        var minusBtn = document.createElement('button');
        minusBtn.className = 'cart-qty-btn';
        minusBtn.setAttribute('aria-label', 'Decrease quantity');
        minusBtn.innerHTML = '&minus;';
        minusBtn.addEventListener('click', function() { changeQuantity(item.key, item.quantity - 1); });

        var qtySpan = document.createElement('span');
        qtySpan.textContent = item.quantity;

        var plusBtn = document.createElement('button');
        plusBtn.className = 'cart-qty-btn';
        plusBtn.setAttribute('aria-label', 'Increase quantity');
        plusBtn.textContent = '+';
        plusBtn.addEventListener('click', function() { changeQuantity(item.key, item.quantity + 1); });

        qtyWrap.appendChild(minusBtn);
        qtyWrap.appendChild(qtySpan);
        qtyWrap.appendChild(plusBtn);
        info.appendChild(qtyWrap);

        row.appendChild(info);
        itemsContainer.appendChild(row);
      });

      if (totalEl) totalEl.textContent = formatMoney(cart.total_price);
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
          form.submit();
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
    var overlayEl = popup.querySelector('.newsletter-popup-overlay');
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

    if (getCookie(COOKIE_NAME)) return;

    var shown = false;
    function showPopup() {
      if (shown) return;
      shown = true;
      popup.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    // Delay-based trigger (default 30s)
    var delay = parseInt(popup.dataset.delay || '30000', 10);
    setTimeout(showPopup, delay);

    // Exit-intent trigger (mouse leaves viewport top)
    if (popup.dataset.exitIntent === 'true') {
      document.addEventListener('mouseout', function(e) {
        if (e.clientY <= 0 && !shown) showPopup();
      });
    }

    function closePopup() {
      popup.classList.remove('active');
      document.body.style.overflow = '';
      setCookie(COOKIE_NAME, '1', DISMISS_DAYS);
    }

    if (closeBtn) closeBtn.addEventListener('click', closePopup);
    if (overlayEl) overlayEl.addEventListener('click', closePopup);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && popup.classList.contains('active')) closePopup();
    });

    if (form) {
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        var successMsg = document.createElement('p');
        successMsg.style.cssText = 'text-align:center;font-size:18px;font-weight:600;';
        successMsg.textContent = 'Welcome aboard! Check your inbox.';
        // Submit the Shopify form natively via fetch
        var formData = new FormData(form);
        fetch(form.action, {
          method: 'POST',
          body: formData
        }).then(function() {
          form.parentNode.replaceChild(successMsg, form);
          setTimeout(closePopup, 2500);
        }).catch(function() {
          form.submit();
        });
      });
    }
  })();


  // === COLLECTIONS CAROUSEL ===
  (function() {
    document.querySelectorAll('.carousel-track').forEach(function(track) {
      var wrapper = track.closest('.carousel-container');
      if (!wrapper) return;

      var prevBtn = wrapper.querySelector('.carousel-arrow--prev');
      var nextBtn = wrapper.querySelector('.carousel-arrow--next');
      var dotsContainer = wrapper.parentElement.querySelector('.carousel-dots');
      var cards = Array.from(track.children);
      if (cards.length === 0) return;

      // Show arrows if content overflows
      function checkOverflow() {
        var overflows = track.scrollWidth > track.clientWidth;
        if (prevBtn) prevBtn.style.display = overflows ? 'flex' : 'none';
        if (nextBtn) nextBtn.style.display = overflows ? 'flex' : 'none';
      }
      checkOverflow();
      window.addEventListener('resize', checkOverflow);

      // Arrow navigation
      function scrollAmount() { return track.clientWidth * 0.8; }
      if (prevBtn) prevBtn.addEventListener('click', function() { track.scrollBy({ left: -scrollAmount(), behavior: 'smooth' }); });
      if (nextBtn) nextBtn.addEventListener('click', function() { track.scrollBy({ left: scrollAmount(), behavior: 'smooth' }); });

      // Auto-advance every 5 seconds
      var autoplayInterval = setInterval(function() {
        if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
          track.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
        }
      }, 5000);

      // Pause on hover/touch
      track.addEventListener('mouseenter', function() { clearInterval(autoplayInterval); });
      track.addEventListener('mouseleave', function() {
        autoplayInterval = setInterval(function() {
          if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            track.scrollBy({ left: scrollAmount(), behavior: 'smooth' });
          }
        }, 5000);
      });
      track.addEventListener('touchstart', function() { clearInterval(autoplayInterval); }, { passive: true });

      // Build dots
      if (dotsContainer && cards.length > 0) {
        var cardWidth = cards[0].offsetWidth + 12;
        var visibleCards = Math.round(track.clientWidth / cardWidth) || 1;
        var dotCount = Math.ceil(cards.length / visibleCards);
        for (var i = 0; i < dotCount; i++) {
          var dot = document.createElement('button');
          dot.className = 'carousel-dot' + (i === 0 ? ' active' : '');
          dot.setAttribute('aria-label', 'Go to slide ' + (i + 1));
          (function(idx) {
            dot.addEventListener('click', function() {
              track.scrollTo({ left: idx * track.clientWidth, behavior: 'smooth' });
            });
          })(i);
          dotsContainer.appendChild(dot);
        }

        // Update active dot on scroll
        track.addEventListener('scroll', function() {
          var scrollRatio = track.scrollLeft / (track.scrollWidth - track.clientWidth);
          var activeDot = Math.round(scrollRatio * (dotCount - 1));
          dotsContainer.querySelectorAll('.carousel-dot').forEach(function(d, idx) {
            d.classList.toggle('active', idx === activeDot);
          });
        });
      }
    });
  })();


  // === STICKY ADD-TO-CART BAR (Mobile) ===
  (function() {
    var stickyBar = document.getElementById('StickyAtcBar');
    var mainAddBtn = document.querySelector('.add-to-cart');
    if (!stickyBar || !mainAddBtn) return;

    var stickyBtn = stickyBar.querySelector('.sticky-atc-btn');
    var stickyPrice = stickyBar.querySelector('.sticky-atc-bar__price');

    // Show/hide based on scroll position of main add-to-cart button
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        var show = !entry.isIntersecting;
        stickyBar.classList.toggle('visible', show);
        document.body.classList.toggle('sticky-atc-visible', show);
      });
    }, { threshold: 0 });

    observer.observe(mainAddBtn);

    // Sync variant changes to sticky bar
    var idInput = document.querySelector('form[action="/cart/add"] input[name="id"]');
    if (idInput) {
      var mo = new MutationObserver(function() {
        if (stickyBtn) stickyBtn.dataset.variantId = idInput.value;
      });
      mo.observe(idInput, { attributes: true, attributeFilter: ['value'] });
    }

    // Sync price text from main price element
    var priceEl = document.querySelector('.product-current-price');
    if (priceEl && stickyPrice) {
      var priceMo = new MutationObserver(function() {
        stickyPrice.textContent = priceEl.textContent;
      });
      priceMo.observe(priceEl, { childList: true, characterData: true, subtree: true });
    }

    // Sync disabled state from main button
    var btnMo = new MutationObserver(function() {
      if (stickyBtn) {
        stickyBtn.disabled = mainAddBtn.disabled;
        stickyBtn.textContent = mainAddBtn.textContent;
      }
    });
    btnMo.observe(mainAddBtn, { attributes: true, attributeFilter: ['disabled'], childList: true });

    // Click handler — add to cart via AJAX
    if (stickyBtn) {
      stickyBtn.addEventListener('click', function() {
        if (stickyBtn.disabled) return;
        var variantId = stickyBtn.dataset.variantId || (idInput && idInput.value);
        if (!variantId) return;

        fetch('/cart/add.js', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: parseInt(variantId, 10), quantity: 1 })
        })
          .then(function(r) { return r.json(); })
          .then(function() {
            // Trigger cart drawer open
            var cartLink = document.querySelector('.header-cart');
            if (cartLink) cartLink.click();
          });
      });
    }
  })();


  // === SHOPIFY SECTION EVENTS (for customizer live preview) ===
  document.addEventListener('shopify:section:load', function() {});

  document.addEventListener('shopify:section:select', function(event) {
    var section = document.getElementById('shopify-section-' + event.detail.sectionId);
    if (section) section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

});

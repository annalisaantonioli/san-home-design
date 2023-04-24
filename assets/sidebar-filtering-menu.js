class SidebarNavFiltersForm extends HTMLElement {
  constructor() {
    super();
    this.onActiveFilterClick = this.onActiveFilterClick.bind(this);

    this.debouncedOnSubmit = debounce((event) => {
      this.onSubmitHandler(event);
    }, 500);

    const facetForm = this.querySelector('form');
    facetForm.addEventListener('input', this.debouncedOnSubmit.bind(this));

    const facetWrapper = this.querySelector('#SidebarNavWrapperDesktop');
    if (facetWrapper) facetWrapper.addEventListener('keyup', onKeyUpEscape);
  }

  static setListeners() {
    const onHistoryChange = (event) => {
      const searchParams = event.state
        ? event.state.searchParams
        : SidebarNavFiltersForm.searchParamsInitial;
      if (searchParams === SidebarNavFiltersForm.searchParamsPrev) return;
      SidebarNavFiltersForm.renderPage(searchParams, null, false);
    };
    window.addEventListener('popstate', onHistoryChange);
  }

  static toggleActiveFacets(disable = true) {
    document.querySelectorAll('.js-facet-remove').forEach((element) => {
      element.classList.toggle('disabled', disable);
    });
  }

  static renderPage(searchParams, event, updateURLHash = true) {
    SidebarNavFiltersForm.searchParamsPrev = searchParams;
    const sections = SidebarNavFiltersForm.getSections();
    const countContainer = document.getElementById('ProductCount');
    const countContainerDesktop = document.getElementById(
      'ProductCountDesktop',
    );
    document
      .getElementById('ProductGridContainer')
      .querySelector('.collection')
      .classList.add('loading');
    if (countContainer) {
      countContainer.classList.add('loading');
    }
    if (countContainerDesktop) {
      countContainerDesktop.classList.add('loading');
    }

    sections.forEach((section) => {
      const url = `${window.location.pathname}?section_id=${section.section}&${searchParams}`;
      const filterDataUrl = (element) => element.url === url;

      SidebarNavFiltersForm.filterData.some(filterDataUrl)
        ? SidebarNavFiltersForm.renderSectionFromCache(filterDataUrl, event)
        : SidebarNavFiltersForm.renderSectionFromFetch(url, event);
    });

    if (updateURLHash) SidebarNavFiltersForm.updateURLHash(searchParams);
  }

  static renderSectionFromFetch(url, event) {
    fetch(url)
      .then((response) => response.text())
      .then((responseText) => {
        const html = responseText;
        SidebarNavFiltersForm.filterData = [
          ...SidebarNavFiltersForm.filterData,
          { html, url },
        ];
        SidebarNavFiltersForm.renderFilters(html, event);
        SidebarNavFiltersForm.renderProductGridContainer(html);
        SidebarNavFiltersForm.renderProductCount(html);
      });
  }

  static renderSectionFromCache(filterDataUrl, event) {
    const html = SidebarNavFiltersForm.filterData.find(filterDataUrl).html;
    SidebarNavFiltersForm.renderFilters(html, event);
    SidebarNavFiltersForm.renderProductGridContainer(html);
    SidebarNavFiltersForm.renderProductCount(html);
  }

  static renderProductGridContainer(html) {
    document.getElementById('ProductGridContainer').innerHTML = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductGridContainer').innerHTML;
  }

  static renderProductCount(html) {
    const count = new DOMParser()
      .parseFromString(html, 'text/html')
      .getElementById('ProductCount').innerHTML;
    const container = document.getElementById('ProductCount');
    const containerDesktop = document.getElementById('ProductCountDesktop');
    container.innerHTML = count;
    container.classList.remove('loading');
    if (containerDesktop) {
      containerDesktop.innerHTML = count;
      containerDesktop.classList.remove('loading');
    }
  }

  static renderFilters(html, event) {
    const parsedHTML = new DOMParser().parseFromString(html, 'text/html');

    const facetDetailsElements = parsedHTML.querySelectorAll(
      '#SidebarNavFiltersForm .js-filter-shd, #SidebarNavFiltersFormMobile .js-filter-shd, #FacetFiltersPillsForm .js-filter-shd',
    );
    const matchesIndex = (element) => {
      const jsFilter = event ? event.target.closest('.js-filter-shd') : undefined;
      return jsFilter
        ? element.dataset.index === jsFilter.dataset.index
        : false;
    };
    const facetsToRender = Array.from(facetDetailsElements).filter(
      (element) => !matchesIndex(element),
    );
    const countsToRender = Array.from(facetDetailsElements).find(matchesIndex);

    facetsToRender.forEach((element) => {
      document.querySelector(
        `.js-filter-shd[data-index="${element.dataset.index}"]`,
      ).innerHTML = element.innerHTML;
    });

    SidebarNavFiltersForm.renderActiveFacets(parsedHTML);
    SidebarNavFiltersForm.renderAdditionalElements(parsedHTML);

    if (countsToRender)
      SidebarNavFiltersForm.renderCounts(
        countsToRender,
        event.target.closest('.js-filter-shd'),
      );
  }

  static renderActiveFacets(html) {
    const activeFacetElementSelectors = [
      '.active-facets-mobile',
      '.active-facets-desktop',
    ];

    activeFacetElementSelectors.forEach((selector) => {
      const activeFacetsElement = html.querySelector(selector);
      if (!activeFacetsElement) return;
      document.querySelector(selector).innerHTML =
        activeFacetsElement.innerHTML;
    });

    SidebarNavFiltersForm.toggleActiveFacets(false);
  }

  static renderAdditionalElements(html) {
    const mobileElementSelectors = [
      '.mobile-facets__open',
      '.mobile-facets__count',
      '.sorting',
    ];

    mobileElementSelectors.forEach((selector) => {
      if (!html.querySelector(selector)) return;
      document.querySelector(selector).innerHTML =
        html.querySelector(selector).innerHTML;
    });

    document
      .getElementById('SidebarNavFiltersFormMobile')
      .closest('menu-drawer')
      .bindEvents();
  }

  static renderCounts(source, target) {
    const targetElement = target.querySelector('.shd-facets__selected');
    const sourceElement = source.querySelector('.shd-facets__selected');

    const targetElementAccessibility = target.querySelector('.shd-facets__summary');
    const sourceElementAccessibility = source.querySelector('.shd-facets__summary');

    if (sourceElement && targetElement) {
      target.querySelector('.shd-facets__selected').outerHTML =
        source.querySelector('.shd-facets__selected').outerHTML;
    }

    if (targetElementAccessibility && sourceElementAccessibility) {
      target.querySelector('.shd-facets__summary').outerHTML =
        source.querySelector('.shd-facets__summary').outerHTML;
    }
  }

  static updateURLHash(searchParams) {
    history.pushState(
      { searchParams },
      '',
      `${window.location.pathname}${searchParams && '?'.concat(searchParams)}`,
    );
  }

  static getSections() {
    return [
      {
        section: document.getElementById('product-grid').dataset.id,
      },
    ];
  }

  createSearchParams(form) {
    const formData = new FormData(form);
    return new URLSearchParams(formData).toString();
  }

  onSubmitForm(searchParams, event) {
    SidebarNavFiltersForm.renderPage(searchParams, event);
  }

  onSubmitHandler(event) {
    event.preventDefault();
    const sortFilterForms = document.querySelectorAll(
      'sidebar-filter-filters-form form',
    );
    if (event.srcElement.className == 'mobile-facets__checkbox') {
      const searchParams = this.createSearchParams(
        event.target.closest('form'),
      );
      this.onSubmitForm(searchParams, event);
    } else {
      const forms = [];
      const isMobile =
        event.target.closest('form').id === 'SidebarNavFiltersFormMobile';

      sortFilterForms.forEach((form) => {
        if (!isMobile) {
          if (
            form.id === 'FacetSortForm' ||
            form.id === 'SidebarNavFiltersForm' ||
            form.id === 'FacetSortDrawerForm'
          ) {
            const noJsElements = document.querySelectorAll('.no-js-list');
            noJsElements.forEach((el) => el.remove());
            forms.push(this.createSearchParams(form));
          }
        } else if (form.id === 'SidebarNavFiltersFormMobile') {
          forms.push(this.createSearchParams(form));
        }
      });
      this.onSubmitForm(forms.join('&'), event);
    }
  }

  onActiveFilterClick(event) {
    event.preventDefault();
    SidebarNavFiltersForm.toggleActiveFacets();
    const url =
      event.currentTarget.href.indexOf('?') == -1
        ? ''
        : event.currentTarget.href.slice(
            event.currentTarget.href.indexOf('?') + 1,
          );
    SidebarNavFiltersForm.renderPage(url);
  }
}

SidebarNavFiltersForm.filterData = [];
SidebarNavFiltersForm.searchParamsInitial = window.location.search.slice(1);
SidebarNavFiltersForm.searchParamsPrev = window.location.search.slice(1);
customElements.define('sidebar-filter-filters-form', SidebarNavFiltersForm);
SidebarNavFiltersForm.setListeners();

// class PriceRange extends HTMLElement {
//   constructor() {
//     super();
//     this.querySelectorAll('input').forEach((element) =>
//       element.addEventListener('change', this.onRangeChange.bind(this)),
//     );
//     this.setMinAndMaxValues();
//   }

//   onRangeChange(event) {
//     this.adjustToValidValues(event.currentTarget);
//     this.setMinAndMaxValues();
//   }

//   setMinAndMaxValues() {
//     const inputs = this.querySelectorAll('input');
//     const minInput = inputs[0];
//     const maxInput = inputs[1];
//     if (maxInput.value) minInput.setAttribute('max', maxInput.value);
//     if (minInput.value) maxInput.setAttribute('min', minInput.value);
//     if (minInput.value === '') maxInput.setAttribute('min', 0);
//     if (maxInput.value === '')
//       minInput.setAttribute('max', maxInput.getAttribute('max'));
//   }

//   adjustToValidValues(input) {
//     const value = Number(input.value);
//     const min = Number(input.getAttribute('min'));
//     const max = Number(input.getAttribute('max'));

//     if (value < min) input.value = min;
//     if (value > max) input.value = max;
//   }
// }

// customElements.define('price-range', PriceRange);

// class FacetRemove extends HTMLElement {
//   constructor() {
//     super();
//     const facetLink = this.querySelector('a');
//     facetLink.setAttribute('role', 'button');
//     facetLink.addEventListener('click', this.closeFilter.bind(this));
//     facetLink.addEventListener('keyup', (event) => {
//       event.preventDefault();
//       if (event.code.toUpperCase() === 'SPACE') this.closeFilter(event);
//     });
//   }

//   closeFilter(event) {
//     event.preventDefault();
//     const form =
//       this.closest('sidebar-filter-filters-form') ||
//       document.querySelector('sidebar-filter-filters-form');
//     form.onActiveFilterClick(event);
//   }
// }

//customElements.define('facet-remove', FacetRemove);

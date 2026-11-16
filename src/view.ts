import { el } from './dom.js';
import { mapCountryDetails } from './mapCountryDetails.js';
import { mapCountryResponse } from './mapCountryResponse.js';
import type { SearchController, SearchState } from './searchController.js';
import type { ApiCountry } from './types.js';

const NO_VALUE = '—';
const numberFormat = new Intl.NumberFormat('en-US');

type SearchFailureState = Extract<SearchState, { status: 'error' }>['failure'];

const ERROR_MESSAGES: Record<SearchFailureState, string> = {
  timeout: 'The server took too long to respond.',
  http: 'The server returned an error.',
  network: 'Could not reach the server. Check your connection.',
};

const listOrDash = (items: string[]): string => (items.length > 0 ? items.join(', ') : NO_VALUE);

function isHttpsUrl(url: string): boolean {
  try {
    return new URL(url).protocol === 'https:';
  } catch {
    return false;
  }
}

function createFlag(flagUrl: string, countryName: string, className: string): HTMLElement {
  if (!isHttpsUrl(flagUrl)) {
    return el('span', { class: `${className} ${className}--empty`, attrs: { 'aria-hidden': 'true' } });
  }
  return el('img', { class: className, attrs: { src: flagUrl, alt: `Flag of ${countryName}`, loading: 'lazy' } });
}

function createCard(country: ApiCountry, onOpen: (country: ApiCountry) => void): HTMLElement {
  const card = mapCountryResponse(country);
  const button = el('button', { class: 'card', attrs: { type: 'button' } }, [
    createFlag(card.flagUrl, card.name, 'card__flag'),
    el('span', { class: 'card__body' }, [
      el('span', { class: 'card__name', text: card.name }),
      el('span', { class: 'card__meta', text: `Capital: ${card.capital}` }),
      el('span', { class: 'card__meta', text: `Region: ${card.region}` }),
      el('span', { class: 'card__meta', text: `Population: ${numberFormat.format(card.population)}` }),
    ]),
  ]);
  button.addEventListener('click', () => onOpen(country));

  return el('li', { class: 'cards__item' }, [button]);
}

function createDetails(country: ApiCountry, onClose: () => void): HTMLElement {
  const details = mapCountryDetails(country);
  const closeButton = el('button', { class: 'details__close', text: 'Close', attrs: { type: 'button' } });
  closeButton.addEventListener('click', onClose);

  const row = (label: string, value: string): Node[] => [el('dt', { text: label }), el('dd', { text: value })];

  return el('div', { class: 'details__content' }, [
    el('header', { class: 'details__header' }, [
      createFlag(details.flagUrl, details.name, 'details__flag'),
      el('h2', { class: 'details__title', text: details.name, attrs: { id: 'details-title' } }),
      closeButton,
    ]),
    el('p', { class: 'details__description', text: details.description }),
    el('dl', { class: 'details__list' }, [
      ...row('Capital', details.capital),
      ...row('Region', details.region),
      ...row('Population', numberFormat.format(details.population)),
      ...row('Area', details.area === null ? NO_VALUE : `${numberFormat.format(details.area)} km²`),
      ...row('Borders', listOrDash(details.borders)),
      ...row('Languages', listOrDash(details.languages)),
      ...row('Currencies', listOrDash(details.currencies)),
    ]),
  ]);
}

export function createApp(controller: SearchController): HTMLElement {
  const input = el('input', {
    class: 'search__input',
    attrs: { id: 'search', type: 'search', placeholder: 'Type a country name…', autocomplete: 'off' },
  });
  const status = el('div', { class: 'status', attrs: { 'aria-live': 'polite' } });
  const list = el('ul', { class: 'cards' });
  const dialog = el('dialog', { class: 'details', attrs: { 'aria-labelledby': 'details-title' } });

  const openDetails = (country: ApiCountry): void => {
    dialog.replaceChildren(createDetails(country, () => dialog.close()));
    dialog.showModal();
  };

  // A click on the backdrop (the dialog element itself, outside its content) closes the dialog.
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) {
      dialog.close();
    }
  });

  input.addEventListener('input', () => controller.input(input.value));

  const render = (state: SearchState): void => {
    status.replaceChildren();
    list.replaceChildren();

    switch (state.status) {
      case 'idle':
        status.append(el('p', { class: 'status__text', text: 'Start typing to search for a country.' }));
        break;
      case 'loading':
        status.append(
          el('span', { class: 'spinner', attrs: { 'aria-hidden': 'true' } }),
          el('p', { class: 'status__text', text: `Searching for “${state.query}”…` }),
        );
        break;
      case 'results':
        status.append(
          el('p', { class: 'status__text', text: `Found ${state.countries.length} for “${state.query}”.` }),
        );
        list.append(...state.countries.map((country) => createCard(country, openDetails)));
        break;
      case 'empty':
        status.append(
          el('p', { class: 'status__text', text: `Nothing found for “${state.query}”. Try another name.` }),
        );
        break;
      case 'error': {
        const retryButton = el('button', { class: 'status__retry', text: 'Retry', attrs: { type: 'button' } });
        retryButton.addEventListener('click', () => controller.retry());
        status.append(
          el('p', { class: 'status__text status__text--error', text: ERROR_MESSAGES[state.failure] }),
          retryButton,
        );
        break;
      }
    }
  };

  controller.subscribe(render);
  render(controller.getState());

  return el('main', { class: 'app' }, [
    el('h1', { class: 'app__title', text: 'Country Search' }),
    el('label', { class: 'search__label', text: 'Country name', attrs: { for: 'search' } }),
    input,
    status,
    list,
    dialog,
  ]);
}

import { createSearchController } from './searchController.js';
import { createApp } from './view.js';

document.body.append(createApp(createSearchController()));

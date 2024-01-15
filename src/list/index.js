import { collection, collection_attributes } from '../mixins/collection';
import { message_passing } from '../mixins/message_passing';
import { sortable, sortable_attributes } from '../mixins/sortable';


const operations = (list) => ({
  insert: ({ items, newPos }) =>
    () => {
      const frag = document.createDocumentFragment();
      for (const item of items) {
        const node = document.createElement('esc-item');
        node.appendChild(document.createElement('slot'));
        node.setAttribute('id', item.key);
        node.update_data(item);
        frag.appendChild(node);
      }
      list.insertBefore(frag, list.children[newPos]);
    },
  remove: ({ items, length, newPos }) =>
    () => {
      for (let i = items?.length ?? length; i > 0; i--)
        list.children[newPos].remove();
    },
  update: ({ items, newPos }) =>
    () => {
      for (let i = items.length - 1; i >= 0; i--)
        list.children[newPos + i].update_data(items[i]);
    },
});


export class List extends sortable(collection(HTMLUListElement)) {
  static observedAttributes = [
    ...collection_attributes,
    ...sortable_attributes,
    'items'
  ];

  _shadow = null;

  constructor() {
    super();
    const template = document.getElementById('esc-list-template').content;
    this._shadow = this.attachShadow({ mode: "open" });
    if (template) this._shadow.appendChild(template.cloneNode(true));
    else console.error('List template not loaded');
    this.sub('collection', 'update', this.update_dom);
    this.sub('sortable', 'sort', this.update_dom);
    this.sub('controller', 'data', this.update_data);
  }

  attributeChangedCallback(name, prev, value) {
    if (prev !== value && name === 'items')
      try {
        this.update_data({ action: 'set', items: JSON.parse(value || '[]') });
      } catch (e) {
        console.error(e);
      }
  }

  connectedCallback() {
  }

  disconnectedCallback() {
    this.destructor();
  }

  update_dom({ patch }) {
    const { insert, replace, update } = operations(this);
    const updates = new Array(patch.length);
    for (const step of patch)
      if (step.type === 'add')
        updates.push(step.update ? update(step) : insert(step));
      else if (step.type === 'remove' && !step.update)
        updates.push(remove(step));
    for (const update of updates) update();
  }

  update_data({ action, items }) {
    switch (action) {
    case 'set': return this.set_collection(items);
    case 'add': return this.add_to_collection(items);
    case 'update': return this.update_collection(items);
    }
  }
}


class ListItem extends HTMLLiElement {
  static observedAttributes = ['data'];

  _data = {};
  _shadow = null;

  constructor() {
    super();
    const template = document.getElementById('esc-list-item-template')?.content;
    this._shadow = this.attachShadow({ mode: "open" });
    if (template) this._shadow.appendChild(template.cloneNode(true));
    else console.error('ListItem template not loaded');
    this.update_dom();
  }

  attributeChangedCallback(name, prev, value) {
    if (prev !== value && name === 'data')
      try {
        this.update_data(JSON.parse(value || '{}'));
        this.update_dom();
      } catch (e) {
        console.error(e);
      }
  }

  update_dom({ data, changes }) {
    if (data) update_data(data);
    else
      for (const key of changes || Object.keys(this._data)) {
        const value = this._data[key];
        for (const el of this._shadow.querySelectorAll(`[esc-prop="${key}"]`))
          if (value instanceof Element) {
            el.textContent = '';
            el.appendChild(value);
          } else {
            el.textContent = value;
          }
        for (const el of this._shadow.querySelectorAll(`[esc-attr$="=${key}"]`))
          if (value) el.setAttribute(key, value);
          else removeAttribute(key);
      }
  }

  update_data(data) {
    const changes = [];
    for (const key in data)
      if (value !== this._data[key]) {
        this._data[key] = value;
        changes.push(key);
      }
    if (changes.length) update_dom({ changes });
  }
}

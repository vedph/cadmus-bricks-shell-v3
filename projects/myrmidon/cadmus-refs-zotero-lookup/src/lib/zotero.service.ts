import { Injectable, Inject, Optional, InjectionToken } from '@angular/core';
import {
  HttpClient,
  HttpParams,
  HttpHeaders,
  HttpResponse,
} from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { map, catchError, retry } from 'rxjs/operators';

import { RamStorageService } from '@myrmidon/ngx-tools';

// injection tokens for configuration
export const ZOTERO_API_BASE_TOKEN = new InjectionToken<string>(
  'ZOTERO_API_BASE'
);
export const ZOTERO_API_KEY_TOKEN = new InjectionToken<string>(
  'ZOTERO_API_KEY'
);
export const ZOTERO_USER_ID_TOKEN = new InjectionToken<string>(
  'ZOTERO_USER_ID'
);

// default configuration
export const DEFAULT_ZOTERO_API_BASE = 'https://api.zotero.org';

//#region Enums
export enum ZoteroLibraryType {
  /**
   * A personal Zotero library owned by a single user.
   * All items, collections, and data belong to that individual account.
   */
  USER = 'users',
  /**
   * A shared Zotero library associated with a group of users. Multiple
   * users can collaborate, add, and manage items in this library.
   */
  GROUP = 'groups',
}

export enum ZoteroItemType {
  ARTWORK = 'artwork',
  ATTACHMENT = 'attachment',
  AUDIO_RECORDING = 'audioRecording',
  BILL = 'bill',
  BLOG_POST = 'blogPost',
  BOOK = 'book',
  BOOK_SECTION = 'bookSection',
  CASE = 'case',
  COMPUTER_PROGRAM = 'computerProgram',
  CONFERENCE_PAPER = 'conferencePaper',
  DICTIONARY_ENTRY = 'dictionaryEntry',
  DOCUMENT = 'document',
  EMAIL = 'email',
  ENCYCLOPEDIA_ARTICLE = 'encyclopediaArticle',
  FILM = 'film',
  FORUM_POST = 'forumPost',
  HEARING = 'hearing',
  INSTANT_MESSAGE = 'instantMessage',
  INTERVIEW = 'interview',
  JOURNAL_ARTICLE = 'journalArticle',
  LETTER = 'letter',
  MAGAZINE_ARTICLE = 'magazineArticle',
  MANUSCRIPT = 'manuscript',
  MAP = 'map',
  NEWSPAPER_ARTICLE = 'newspaperArticle',
  NOTE = 'note',
  PATENT = 'patent',
  PODCAST = 'podcast',
  PRESENTATION = 'presentation',
  RADIO_BROADCAST = 'radioBroadcast',
  REPORT = 'report',
  STATUTE = 'statute',
  THESIS = 'thesis',
  TV_BROADCAST = 'tvBroadcast',
  VIDEO_RECORDING = 'videoRecording',
  WEB_PAGE = 'webpage',
}

export enum ZoteroSortField {
  DATE_ADDED = 'dateAdded',
  DATE_MODIFIED = 'dateModified',
  TITLE = 'title',
  CREATOR = 'creator',
  ITEM_TYPE = 'itemType',
  DATE = 'date',
  PUBLISHER = 'publisher',
  PUBLICATION_TITLE = 'publicationTitle',
  JOURNAL_ABBREVIATION = 'journalAbbreviation',
  LANGUAGE = 'language',
  ACCESS_DATE = 'accessDate',
  LIBRARY_CATALOG = 'libraryCatalog',
  CALL_NUMBER = 'callNumber',
  RIGHTS = 'rights',
  ADDED_BY = 'addedBy',
}

export enum ZoteroDirection {
  ASC = 'asc',
  DESC = 'desc',
}

export enum ZoteroFormat {
  ATOM = 'atom',
  BIB = 'bib',
  JSON = 'json',
  KEYS = 'keys',
  VERSIONS = 'versions',
}
//#endregion

//#region Interfaces and Models
export interface ZoteroCreator {
  creatorType: string;
  firstName?: string;
  lastName?: string;
  name?: string;
}

export interface ZoteroData {
  key: string;
  version: number;
  itemType: string;
  title?: string;
  creators?: ZoteroCreator[];
  abstractNote?: string;
  publicationTitle?: string;
  volume?: string;
  issue?: string;
  pages?: string;
  date?: string;
  series?: string;
  seriesTitle?: string;
  seriesText?: string;
  seriesNumber?: string;
  edition?: string;
  place?: string;
  publisher?: string;
  numPages?: string;
  bookTitle?: string;
  caseName?: string;
  nameOfAct?: string;
  subject?: string;
  proceedingsTitle?: string;
  conferenceName?: string;
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  url?: string;
  accessDate?: string;
  archive?: string;
  archiveLocation?: string;
  libraryCatalog?: string;
  callNumber?: string;
  rights?: string;
  extra?: string;
  tags?: ZoteroTag[];
  collections?: string[];
  relations?: { [key: string]: string | string[] };
  dateAdded?: string;
  dateModified?: string;
  [key: string]: any;
}

export interface ZoteroTag {
  tag: string;
  type?: number;
}

export interface ZoteroItem {
  key: string;
  version: number;
  library: ZoteroLibrary;
  links: ZoteroLinks;
  meta: ZoteroMeta;
  data: ZoteroData;
}

export interface ZoteroLibrary {
  type: string;
  id: number;
  name: string;
  links: ZoteroLinks;
}

export interface ZoteroLinks {
  self: ZoteroLink;
  alternate?: ZoteroLink;
  up?: ZoteroLink;
  enclosure?: ZoteroLink;
}

export interface ZoteroLink {
  href: string;
  type: string;
  title?: string;
}

export interface ZoteroMeta {
  createdByUser?: ZoteroUser;
  lastModifiedByUser?: ZoteroUser;
  creatorSummary?: string;
  parsedDate?: string;
  numChildren?: number;
}

export interface ZoteroUser {
  id: number;
  username: string;
  name: string;
}

export interface ZoteroCollection {
  key: string;
  version: number;
  library: ZoteroLibrary;
  links: ZoteroLinks;
  meta: ZoteroMeta;
  data: ZoteroCollectionData;
}

export interface ZoteroCollectionData {
  key: string;
  version: number;
  name: string;
  parentCollection?: string | false;
  relations: { [key: string]: string | string[] };
}

export interface ZoteroSearch {
  key: string;
  version: number;
  library: ZoteroLibrary;
  links: ZoteroLinks;
  meta: ZoteroMeta;
  data: ZoteroSearchData;
}

export interface ZoteroSearchData {
  key: string;
  version: number;
  name: string;
  conditions: ZoteroSearchCondition[];
}

export interface ZoteroSearchCondition {
  condition: string;
  operator: string;
  value: string;
}

export interface ZoteroAttachment {
  key: string;
  version: number;
  library: ZoteroLibrary;
  links: ZoteroLinks;
  meta: ZoteroMeta;
  data: ZoteroAttachmentData;
}

export interface ZoteroAttachmentData extends ZoteroData {
  parentItem: string;
  linkMode: string;
  contentType: string;
  charset: string;
  filename: string;
  md5?: string;
  mtime?: number;
}

export interface ZoteroNote {
  key: string;
  version: number;
  library: ZoteroLibrary;
  links: ZoteroLinks;
  meta: ZoteroMeta;
  data: ZoteroNoteData;
}

export interface ZoteroNoteData extends ZoteroData {
  parentItem?: string;
  note: string;
}

export interface ZoteroGroup {
  id: number;
  version: number;
  links: ZoteroLinks;
  meta: ZoteroGroupMeta;
  data: ZoteroGroupData;
}

export interface ZoteroGroupMeta {
  created: string;
  lastModified: string;
  numItems: number;
}

export interface ZoteroGroupData {
  id: number;
  version: number;
  name: string;
  description: string;
  url: string;
  library: ZoteroGroupLibrary;
  members: ZoteroGroupMember[];
  admins: ZoteroGroupAdmin[];
  type: string;
  libraryEditing: string;
  libraryReading: string;
  fileEditing: string;
}

export interface ZoteroGroupLibrary {
  type: string;
  id: number;
  name: string;
  links: ZoteroLinks;
}

export interface ZoteroGroupMember {
  id: number;
  username: string;
  name: string;
  role: string;
}

export interface ZoteroGroupAdmin {
  id: number;
  username: string;
  name: string;
}

export interface ZoteroItemTemplate {
  itemType: string;
  title?: string;
  creators?: ZoteroCreator[];
  [key: string]: any;
}

export interface ZoteroVersion {
  [key: string]: number;
}
//#endregion

//#region Request parameter interfaces
export interface ZoteroSearchParams {
  q?: string;
  qmode?: 'titleCreatorYear' | 'everything';
  since?: number;
  format?: ZoteroFormat;
  include?: ('data' | 'bib' | 'citation')[];
  sort?: ZoteroSortField;
  direction?: ZoteroDirection;
  limit?: number;
  start?: number;
  itemType?: ZoteroItemType | ZoteroItemType[];
  tag?: string | string[];
  collection?: string;
  itemKey?: string | string[];
  includeTrashed?: boolean;
}

export interface ZoteroCollectionParams {
  format?: ZoteroFormat;
  include?: 'data'[];
  sort?: 'title' | 'dateAdded' | 'dateModified';
  direction?: ZoteroDirection;
  limit?: number;
  start?: number;
  collectionKey?: string | string[];
}

export interface ZoteroResponse<T> {
  data: T[];
  totalResults?: number;
  apiVersion?: string;
  links?: ZoteroLinks;
  meta?: any;
}
//#endregion

/**
 * Zotero API service for interacting with Zotero libraries and items.
 * To use this you will need your API user ID and key. You can specify
 * them via injection tokens, or via a volatile RamStorage when you
 * need to define them at runtime.
 */
@Injectable({
  providedIn: 'root',
})
export class ZoteroService {
  private readonly defaultApiBase: string;
  private readonly defaultApiKey?: string;
  private readonly defaultUserId?: string;

  constructor(
    private _http: HttpClient,
    private _storage: RamStorageService,
    @Optional() @Inject(ZOTERO_API_BASE_TOKEN) apiBase?: string,
    @Optional() @Inject(ZOTERO_API_KEY_TOKEN) apiKey?: string,
    @Optional() @Inject(ZOTERO_USER_ID_TOKEN) userId?: string
  ) {
    this.defaultApiBase = apiBase || DEFAULT_ZOTERO_API_BASE;
    this.defaultApiKey = apiKey;
    this.defaultUserId = userId;
  }

  // getters to retrieve values from storage or fall back to defaults
  private get apiBase(): string {
    return this._storage.retrieve('zoteroApiBase') || this.defaultApiBase;
  }

  private get apiKey(): string | undefined {
    return this._storage.retrieve('zoteroApiKey') || this.defaultApiKey;
  }

  private get userId(): string | undefined {
    return this._storage.retrieve('zoteroUserId') || this.defaultUserId;
  }

  private getHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      Accept: 'application/json',
    });

    if (this.apiKey) {
      headers = headers.set('Zotero-API-Key', this.apiKey);
    }

    return headers;
  }

  private buildParams(params: any): HttpParams {
    let httpParams = new HttpParams();

    Object.keys(params).forEach((key) => {
      const value = params[key];
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach((v) => {
            httpParams = httpParams.append(key, v.toString());
          });
        } else {
          httpParams = httpParams.set(key, value.toString());
        }
      }
    });

    return httpParams;
  }

  private handleResponse<T>(response: HttpResponse<T[]>): ZoteroResponse<T> {
    return {
      data: response.body || [],
      totalResults: response.headers.get('Total-Results')
        ? parseInt(response.headers.get('Total-Results')!, 10)
        : undefined,
      apiVersion: response.headers.get('Zotero-API-Version') || undefined,
      links: this.parseLinks(response.headers.get('Link')),
    };
  }

  private parseLinks(linkHeader: string | null): ZoteroLinks | undefined {
    if (!linkHeader) return undefined;

    const links: any = {};
    const parts = linkHeader.split(',');

    parts.forEach((part) => {
      const section = part.split(';');
      if (section.length === 2) {
        const url = section[0].replace(/<(.*)>/, '$1').trim();
        const name = section[1].replace(/rel="(.*)"/, '$1').trim();
        links[name] = { href: url, type: 'application/json' };
      }
    });

    return links;
  }

  //#region Library items methods
  /**
   * Get items from a Zotero library.
   * @param libraryId The ID of the library.
   * @param libraryType The type of the library (user/group).
   * @param params Query parameters for the request.
   * @returns An observable with the response from the Zotero API.
   */
  public getItems(
    libraryId: string,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP,
    params: ZoteroSearchParams = {}
  ): Observable<ZoteroResponse<ZoteroItem>> {
    if (!libraryId && libraryType === ZoteroLibraryType.USER && this.userId) {
      libraryId = this.userId;
    }

    if (!libraryId) {
      return throwError(() => new Error('Library ID is required'));
    }

    const url = `${this.apiBase}/${libraryType}/${libraryId}/items`;
    const httpParams = this.buildParams(params);

    return this._http
      .get<ZoteroItem[]>(url, {
        headers: this.getHeaders(),
        params: httpParams,
        observe: 'response',
      })
      .pipe(
        retry(3),
        map(
          (response) =>
            this.handleResponse(response) as ZoteroResponse<ZoteroItem>
        ),
        catchError(this.handleError)
      );
  }

  /**
   * Get a single item from a Zotero library.
   * @param libraryId The ID of the library.
   * @param itemKey The key of the item.
   * @param libraryType The type of the library (user/group).
   * @param params Query parameters for the request.
   * @returns An observable with the response from the Zotero API.
   */
  public getItem(
    libraryId: string,
    itemKey: string,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP,
    params: {
      format?: ZoteroFormat;
      include?: ('data' | 'bib' | 'citation')[];
    } = {}
  ): Observable<ZoteroItem> {
    if (!libraryId && libraryType === ZoteroLibraryType.USER && this.userId) {
      libraryId = this.userId;
    }

    if (!libraryId) {
      return throwError(() => new Error('Library ID is required'));
    }

    const url = `${this.apiBase}/${libraryType}/${libraryId}/items/${itemKey}`;
    const httpParams = this.buildParams(params);

    return this._http
      .get<ZoteroItem>(url, {
        headers: this.getHeaders(),
        params: httpParams,
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Create a new item in a Zotero library.
   * @param libraryId The ID of the library.
   * @param item The item data to create.
   * @param libraryType The type of the library (user/group).
   * @returns An observable with the response from the Zotero API.
   */
  public createItem(
    libraryId: string,
    item: Partial<ZoteroData>,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP
  ): Observable<ZoteroItem> {
    if (!libraryId && libraryType === ZoteroLibraryType.USER && this.userId) {
      libraryId = this.userId;
    }

    if (!libraryId) {
      return throwError(() => new Error('Library ID is required'));
    }

    const url = `${this.apiBase}/${libraryType}/${libraryId}/items`;

    return this._http
      .post<ZoteroItem>(url, [item], {
        headers: this.getHeaders().set('Content-Type', 'application/json'),
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Update an existing item in a Zotero library.
   * @param libraryId The ID of the library.
   * @param itemKey The key of the item.
   * @param item The item data to update.
   * @param version The version of the item.
   * @param libraryType The type of the library (user/group).
   * @returns An observable with the response from the Zotero API.
   */
  public updateItem(
    libraryId: string,
    itemKey: string,
    item: Partial<ZoteroData>,
    version: number,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP
  ): Observable<ZoteroItem> {
    if (!libraryId && libraryType === ZoteroLibraryType.USER && this.userId) {
      libraryId = this.userId;
    }

    if (!libraryId) {
      return throwError(() => new Error('Library ID is required'));
    }

    const url = `${this.apiBase}/${libraryType}/${libraryId}/items/${itemKey}`;

    return this._http
      .put<ZoteroItem>(url, item, {
        headers: this.getHeaders()
          .set('Content-Type', 'application/json')
          .set('If-Unmodified-Since-Version', version.toString()),
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Delete an existing item from a Zotero library.
   * @param libraryId The ID of the library.
   * @param itemKey The key of the item.
   * @param version The version of the item.
   * @param libraryType The type of the library (user/group).
   * @returns An observable with the response from the Zotero API.
   */
  public deleteItem(
    libraryId: string,
    itemKey: string,
    version: number,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP
  ): Observable<void> {
    if (!libraryId && libraryType === ZoteroLibraryType.USER && this.userId) {
      libraryId = this.userId;
    }

    if (!libraryId) {
      return throwError(() => new Error('Library ID is required'));
    }

    const url = `${this.apiBase}/${libraryType}/${libraryId}/items/${itemKey}`;

    return this._http
      .delete<void>(url, {
        headers: this.getHeaders().set(
          'If-Unmodified-Since-Version',
          version.toString()
        ),
      })
      .pipe(retry(3), catchError(this.handleError));
  }
  //#endregion

  //#region Collections methods
  /**
   * Get all collections in a Zotero library.
   * @param libraryId The ID of the library.
   * @param libraryType The type of the library (user/group).
   * @param params Optional query parameters.
   * @returns An observable with the response from the Zotero API.
   */
  public getCollections(
    libraryId: string,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP,
    params: ZoteroCollectionParams = {}
  ): Observable<ZoteroResponse<ZoteroCollection>> {
    if (!libraryId && libraryType === ZoteroLibraryType.USER && this.userId) {
      libraryId = this.userId;
    }

    if (!libraryId) {
      return throwError(() => new Error('Library ID is required'));
    }

    const url = `${this.apiBase}/${libraryType}/${libraryId}/collections`;
    const httpParams = this.buildParams(params);

    return this._http
      .get<ZoteroCollection[]>(url, {
        headers: this.getHeaders(),
        params: httpParams,
        observe: 'response',
      })
      .pipe(
        retry(3),
        map(
          (response) =>
            this.handleResponse(response) as ZoteroResponse<ZoteroCollection>
        ),
        catchError(this.handleError)
      );
  }

  public getCollection(
    libraryType: ZoteroLibraryType,
    libraryId: string,
    collectionKey: string
  ): Observable<ZoteroCollection> {
    if (!libraryId && libraryType === ZoteroLibraryType.USER && this.userId) {
      libraryId = this.userId;
    }

    if (!libraryId) {
      return throwError(() => new Error('Library ID is required'));
    }

    const url = `${this.apiBase}/${libraryType}/${libraryId}/collections/${collectionKey}`;

    return this._http
      .get<ZoteroCollection>(url, {
        headers: this.getHeaders(),
      })
      .pipe(retry(3), catchError(this.handleError));
  }
  //#endregion

  //#region Search methods
  /**
   * Search for items in a Zotero library.
   * @param libraryId The ID of the library.
   * @param query The search query.
   * @param libraryType The type of the library (user/group).
   * @param params Optional query parameters.
   * @returns An observable with the response from the Zotero API.
   */
  public search(
    libraryId: string,
    query: string,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP,
    params: Omit<ZoteroSearchParams, 'q'> = {}
  ): Observable<ZoteroResponse<ZoteroItem>> {
    if (!query.trim()) {
      return of({ data: [] });
    }

    return this.getItems(libraryId, libraryType, {
      ...params,
      q: query.trim(),
    });
  }

  /**
   * Search for items in a Zotero library using qmode=everything.
   * @param libraryId The ID of the library.
   * @param query The search query.
   * @param libraryType The type of the library (user/group).
   * @param params Optional query parameters.
   * @returns An observable with the response from the Zotero API.
   */
  public searchEverything(
    libraryId: string,
    query: string,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP,
    params: Omit<ZoteroSearchParams, 'q' | 'qmode'> = {}
  ): Observable<ZoteroResponse<ZoteroItem>> {
    if (!query.trim()) {
      return of({ data: [] });
    }

    return this.getItems(libraryId, libraryType, {
      ...params,
      q: query.trim(),
      qmode: 'everything',
    });
  }
  //#endregion

  //#region Tag methods
  /**
   * Get the tags for a Zotero library.
   * @param libraryId The ID of the library.
   * @param libraryType The type of the library (user/group).
   * @returns An observable with the response from the Zotero API.
   */
  public getTags(
    libraryId: string,
    libraryType: ZoteroLibraryType = ZoteroLibraryType.GROUP
  ): Observable<ZoteroTag[]> {
    if (!libraryId && libraryType === ZoteroLibraryType.USER && this.userId) {
      libraryId = this.userId;
    }

    if (!libraryId) {
      return throwError(() => new Error('Library ID is required'));
    }

    const url = `${this.apiBase}/${libraryType}/${libraryId}/tags`;

    return this._http
      .get<ZoteroTag[]>(url, {
        headers: this.getHeaders(),
      })
      .pipe(retry(3), catchError(this.handleError));
  }
  //#endregion

  //#region Group methods
  /**
   * Get the groups for a Zotero user.
   * @returns An observable with the response from the Zotero API.
   */
  public getGroups(): Observable<ZoteroGroup[]> {
    const url = `${this.apiBase}/users/${this.userId}/groups`;

    return this._http
      .get<ZoteroGroup[]>(url, {
        headers: this.getHeaders(),
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  public getGroup(groupId: string): Observable<ZoteroGroup> {
    const url = `${this.apiBase}/groups/${groupId}`;

    return this._http
      .get<ZoteroGroup>(url, {
        headers: this.getHeaders(),
      })
      .pipe(retry(3), catchError(this.handleError));
  }
  //#endregion

  //#region Template methods
  /**
   * Get the item template for a specific item type.
   * @param itemType The type of the item.
   * @returns An observable with the response from the Zotero API.
   */
  public getItemTemplate(
    itemType: ZoteroItemType
  ): Observable<ZoteroItemTemplate> {
    const url = `${this.apiBase}/items/new`;
    const params = new HttpParams().set('itemType', itemType);

    return this._http
      .get<ZoteroItemTemplate>(url, {
        headers: this.getHeaders(),
        params,
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Get the item types for a Zotero library.
   * @returns An observable with the response from the Zotero API.
   */
  public getItemTypes(): Observable<{ itemType: string; localized: string }[]> {
    const url = `${this.apiBase}/itemTypes`;

    return this._http
      .get<{ itemType: string; localized: string }[]>(url, {
        headers: this.getHeaders(),
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Get the fields for a specific item type.
   * @param itemType The type of the item.
   * @returns An observable with the response from the Zotero API.
   */
  public getItemFields(
    itemType?: ZoteroItemType
  ): Observable<{ field: string; localized: string }[]> {
    const url = `${this.apiBase}/itemFields`;
    let params = new HttpParams();

    if (itemType) {
      params = params.set('itemType', itemType);
    }

    return this._http
      .get<{ field: string; localized: string }[]>(url, {
        headers: this.getHeaders(),
        params,
      })
      .pipe(retry(3), catchError(this.handleError));
  }

  /**
   * Get the creator types for a specific item type.
   * @param itemType The type of the item.
   * @returns An observable with the response from the Zotero API.
   */
  public getCreatorTypes(
    itemType: ZoteroItemType
  ): Observable<{ creatorType: string; localized: string }[]> {
    const url = `${this.apiBase}/itemTypeCreatorTypes`;
    const params = new HttpParams().set('itemType', itemType);

    return this._http
      .get<{ creatorType: string; localized: string }[]>(url, {
        headers: this.getHeaders(),
        params,
      })
      .pipe(retry(3), catchError(this.handleError));
  }
  //#endregion

  //#region Key validation
  /**
   * Get the key permissions for the current user.
   * @returns An observable with the response from the Zotero API.
   */
  public getKeyPermissions(): Observable<{
    username: string;
    userID: number;
    access: any;
  }> {
    if (!this.apiKey) {
      return throwError(() => new Error('API key is required'));
    }

    const url = `${this.apiBase}/keys/${this.apiKey}`;

    return this._http
      .get<{ username: string; userID: number; access: any }>(url, {
        headers: this.getHeaders(),
      })
      .pipe(retry(3), catchError(this.handleError));
  }
  //#endregion

  //#region Utility methods
  /**
   * Get the user information for the current user.
   * @returns An observable with the response from the Zotero API.
   */
  public getMyUserInfo(): Observable<{
    userID: number;
    username: string;
    displayName: string;
  }> {
    if (!this.userId) {
      return throwError(() => new Error('User ID is required'));
    }

    const url = `${this.apiBase}/users/${this.userId}`;

    return this._http
      .get<{ userID: number; username: string; displayName: string }>(url, {
        headers: this.getHeaders(),
      })
      .pipe(retry(3), catchError(this.handleError));
  }
  //#endregion

  //#region Error handling
  private handleError = (error: any): Observable<never> => {
    let errorMessage = 'An unknown error occurred';

    if (error.error instanceof ErrorEvent) {
      // client-side error
      errorMessage = `Client error: ${error.error.message}`;
    } else {
      // server-side error
      switch (error.status) {
        case 400:
          errorMessage = 'Bad Request - Invalid parameters';
          break;
        case 401:
          errorMessage = 'Unauthorized - Invalid API key';
          break;
        case 403:
          errorMessage = 'Forbidden - Insufficient permissions';
          break;
        case 404:
          errorMessage = 'Not Found - Resource does not exist';
          break;
        case 409:
          errorMessage = 'Conflict - Version mismatch';
          break;
        case 412:
          errorMessage = 'Precondition Failed - Version required';
          break;
        case 413:
          errorMessage = 'Request Entity Too Large';
          break;
        case 428:
          errorMessage = 'Precondition Required - Version required';
          break;
        case 429:
          errorMessage = 'Too Many Requests - Rate limited';
          break;
        case 500:
          errorMessage = 'Internal Server Error';
          break;
        default:
          errorMessage = `Server error: ${error.status} - ${error.message}`;
      }
    }

    console.error('Zotero API Error:', errorMessage, error);
    return throwError(() => new Error(errorMessage));
  };
  //#endregion
}

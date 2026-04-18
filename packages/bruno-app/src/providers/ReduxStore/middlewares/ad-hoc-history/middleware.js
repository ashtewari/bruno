import { findCollectionByUid, findItemInCollection } from 'utils/collections';
import { responseReceived } from 'providers/ReduxStore/slices/collections';
import { addAdHocHistoryEntry } from 'providers/ReduxStore/slices/logs';

const AD_HOC_HISTORY_STORAGE_KEY = 'bruno.adHocRequestHistory.v1';

const persistAdHocHistory = (entries) => {
  if (typeof window === 'undefined' || !window.localStorage) {
    return;
  }

  try {
    window.localStorage.setItem(AD_HOC_HISTORY_STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage persistence errors
  }
};

const sanitizeRequest = (request) => {
  if (!request) {
    return null;
  }

  return {
    url: request.url,
    method: request.method,
    headers: request.headers,
    data: request.data,
    dataBuffer: request.dataBuffer,
    timestamp: request.timestamp
  };
};

const sanitizeResponse = (response) => {
  if (!response) {
    return null;
  }

  return {
    status: response.status,
    statusCode: response.statusCode,
    statusText: response.statusText,
    headers: response.headers,
    data: response.data,
    dataBuffer: response.dataBuffer,
    duration: response.duration,
    size: response.size,
    error: response.error,
    isError: response.isError,
    timeline: response.timeline
  };
};

export const adHocHistoryMiddleware = (store) => (next) => (action) => {
  const result = next(action);

  if (addAdHocHistoryEntry.match(action)) {
    const historyEntries = store.getState().logs?.adHocRequestHistory || [];
    persistAdHocHistory(historyEntries);
    return result;
  }

  if (!responseReceived.match(action)) {
    return result;
  }

  const { collectionUid, itemUid } = action.payload;
  const state = store.getState();
  const collection = findCollectionByUid(state.collections.collections, collectionUid);
  const item = collection ? findItemInCollection(collection, itemUid) : null;

  if (!item?.isTransient) {
    return result;
  }

  const request = sanitizeRequest(action.payload.requestSent || item.requestSent || item.request);
  const response = sanitizeResponse(action.payload.response || item.response);
  const timestamp = request?.timestamp || Date.now();
  const historyId = `${collectionUid}:${itemUid}:${item.requestUid || 'request'}:${timestamp}`;

  store.dispatch(addAdHocHistoryEntry({
    historyId,
    type: 'request',
    source: 'ad-hoc-history',
    collectionUid,
    collectionName: collection?.name,
    itemUid,
    requestType: item?.type,
    timestamp,
    data: {
      request,
      response,
      timestamp
    }
  }));

  return result;
};

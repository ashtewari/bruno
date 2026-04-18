import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
  IconX,
  IconFileText,
  IconArrowRight,
  IconNetwork,
  IconHistory
} from '@tabler/icons';
import { clearSelectedRequest } from 'providers/ReduxStore/slices/logs';
import { newHttpRequest } from 'providers/ReduxStore/slices/collections/actions';
import QueryResponse from 'components/ResponsePane/QueryResponse/index';
import Network from 'components/ResponsePane/Timeline/TimelineItem/Network';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common/index';
import { sanitizeName } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { formatIpcError } from 'utils/common/error';

const RequestTab = ({ request, response }) => {
  const formatHeaders = (headers) => {
    if (!headers) return [];
    if (Array.isArray(headers)) return headers;
    return Object.entries(headers).map(([key, value]) => ({ name: key, value }));
  };

  const formatBody = (body) => {
    if (!body) return 'No body';
    if (typeof body === 'string') return body;
    return JSON.stringify(body, null, 2);
  };

  return (
    <div className="tab-content">
      <div className="section">
        <h4>General</h4>
        <div className="info-grid">
          <div className="info-item">
            <span className="label">Request URL:</span>
            <span className="value">{request?.url || 'N/A'}</span>
          </div>
          <div className="info-item">
            <span className="label">Request Method:</span>
            <span className="value">{request?.method || 'GET'}</span>
          </div>
        </div>
      </div>

      <div className="section">
        <h4>Request Headers</h4>
        {formatHeaders(request?.headers).length > 0 ? (
          <div className="headers-table">
            <table>
              <thead>
                <tr>
                  <td>Name</td>
                  <td>Value</td>
                </tr>
              </thead>
              <tbody>
                {formatHeaders(request.headers).map((header, index) => (
                  <tr key={index}>
                    <td className="header-name">{header.name}</td>
                    <td className="header-value">{header.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No headers</div>
        )}
      </div>

      {request?.data && (
        <div className="section">
          <h4>Request Body</h4>
          <pre className="code-block">{formatBody(request.data)}</pre>
        </div>
      )}
    </div>
  );
};

const ResponseTab = ({ response, request, collection }) => {
  const formatHeaders = (headers) => {
    if (!headers) return [];
    if (Array.isArray(headers)) return headers;
    return Object.entries(headers).map(([key, value]) => ({ name: key, value }));
  };

  return (
    <div className="tab-content">
      <div className="section">
        <h4>Response Headers</h4>
        {formatHeaders(response?.headers).length > 0 ? (
          <div className="headers-table">
            <table>
              <thead>
                <tr>
                  <td>Name</td>
                  <td>Value</td>
                </tr>
              </thead>
              <tbody>
                {formatHeaders(response.headers).map((header, index) => (
                  <tr key={index}>
                    <td className="header-name">{header.name}</td>
                    <td className="header-value">{header.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">No headers</div>
        )}
      </div>

      <div className="section">
        <h4>Response Body</h4>
        <div className="response-body-container">
          {response?.data || response?.dataBuffer ? (
            <QueryResponse
              item={{ uid: uuid() }}
              collection={collection}
              data={response.data}
              dataBuffer={response.dataBuffer}
              headers={response.headers}
              error={response.error}
              disableRunEventListener={true}
            />
          ) : (
            <div className="empty-state">No response data</div>
          )}
        </div>
      </div>
    </div>
  );
};

const NetworkTab = ({ response }) => {
  const timeline = response?.timeline || [];

  return (
    <div className="tab-content">
      <div className="section">
        <h4>Network Logs</h4>
        <div className="network-logs-wrapper">
          {timeline.length > 0 ? (
            <Network logs={timeline} />
          ) : (
            <div className="empty-state">No network logs available</div>
          )}
        </div>
      </div>
    </div>
  );
};

const RequestDetailsPanel = () => {
  const dispatch = useDispatch();
  const { selectedRequest } = useSelector((state) => state.logs);
  const collections = useSelector((state) => state.collections.collections);
  const { activeWorkspaceUid, workspaces } = useSelector((state) => state.workspaces);
  const [activeTab, setActiveTab] = useState('request');

  if (!selectedRequest) return null;

  const { data } = selectedRequest;
  const { request, response } = data;

  const collection = collections.find((c) => c.uid === selectedRequest.collectionUid);
  const activeWorkspace = workspaces?.find((w) => w.uid === activeWorkspaceUid);

  const handleClose = () => {
    dispatch(clearSelectedRequest());
  };

  const normalizeHeaders = (headers) => {
    if (!headers) {
      return [];
    }

    if (Array.isArray(headers)) {
      return headers.map((header) => ({
        name: header?.name || '',
        value: header?.value || '',
        enabled: true
      }));
    }

    return Object.entries(headers).map(([name, value]) => ({
      name,
      value: value == null ? '' : String(value),
      enabled: true
    }));
  };

  const inferBody = (request) => {
    const rawData = request?.data;
    if (rawData == null || rawData === '') {
      return {
        mode: 'none',
        json: null,
        text: null,
        xml: null,
        sparql: null,
        multipartForm: [],
        formUrlEncoded: [],
        file: []
      };
    }

    if (typeof rawData === 'object') {
      return {
        mode: 'json',
        json: JSON.stringify(rawData, null, 2),
        text: null,
        xml: null,
        sparql: null,
        multipartForm: [],
        formUrlEncoded: [],
        file: []
      };
    }

    const dataText = String(rawData);
    const contentTypeHeader = normalizeHeaders(request?.headers).find(
      (header) => header.name.toLowerCase() === 'content-type'
    )?.value;
    const looksLikeJson = contentTypeHeader?.toLowerCase()?.includes('json')
      || (dataText.startsWith('{') && dataText.endsWith('}'))
      || (dataText.startsWith('[') && dataText.endsWith(']'));

    if (looksLikeJson) {
      try {
        const parsed = JSON.parse(dataText);
        return {
          mode: 'json',
          json: JSON.stringify(parsed, null, 2),
          text: null,
          xml: null,
          sparql: null,
          multipartForm: [],
          formUrlEncoded: [],
          file: []
        };
      } catch {
        // fall back to plain text mode
      }
    }

    return {
      mode: 'text',
      json: null,
      text: dataText,
      xml: null,
      sparql: null,
      multipartForm: [],
      formUrlEncoded: [],
      file: []
    };
  };

  const handleReopenRequest = () => {
    const targetCollectionUid = collection?.uid || activeWorkspace?.scratchCollectionUid;
    const requestToReopen = request || {};

    if (!targetCollectionUid) {
      toast.error('No active workspace scratch collection found to reopen request');
      return;
    }

    const timestamp = selectedRequest?.timestamp || Date.now();
    const requestName = `History ${new Date(timestamp).toISOString()}`;
    const filename = sanitizeName(`${requestName}-${timestamp}`);

    dispatch(
      newHttpRequest({
        requestName,
        filename,
        requestType: 'http-request',
        requestUrl: requestToReopen.url || '',
        requestMethod: (requestToReopen.method || 'GET').toUpperCase(),
        collectionUid: targetCollectionUid,
        itemUid: null,
        isTransient: true,
        headers: normalizeHeaders(requestToReopen.headers),
        body: inferBody(requestToReopen),
        auth: {
          mode: 'inherit'
        }
      })
    ).catch((error) => {
      toast.error(formatIpcError(error) || 'Failed to reopen request from history');
    });
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const getTabContent = () => {
    switch (activeTab) {
      case 'request':
        return <RequestTab request={request} response={response} />;
      case 'response':
        return <ResponseTab response={response} request={request} collection={collection} />;
      case 'network':
        return <NetworkTab response={response} />;
      default:
        return <RequestTab request={request} response={response} />;
    }
  };

  return (
    <StyledWrapper>
      <div className="panel-header">
        <div className="panel-title">
          <IconFileText size={16} strokeWidth={1.5} />
          <span>Request Details</span>
          <span className="request-time">({formatTime(selectedRequest.timestamp)})</span>
        </div>

        <div className="panel-actions">
          <button
            className="reopen-button"
            onClick={handleReopenRequest}
            title="Reopen as new transient request"
          >
            <IconHistory size={14} strokeWidth={1.5} />
            Reopen
          </button>
          <button
            className="close-button"
            onClick={handleClose}
            title="Close details panel"
          >
            <IconX size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      <div className="panel-tabs">
        <button
          className={`tab-button ${activeTab === 'request' ? 'active' : ''}`}
          onClick={() => setActiveTab('request')}
        >
          <IconArrowRight size={14} strokeWidth={1.5} />
          Request
        </button>

        <button
          className={`tab-button ${activeTab === 'response' ? 'active' : ''}`}
          onClick={() => setActiveTab('response')}
        >
          <IconFileText size={14} strokeWidth={1.5} />
          Response
        </button>

        <button
          className={`tab-button ${activeTab === 'network' ? 'active' : ''}`}
          onClick={() => setActiveTab('network')}
        >
          <IconNetwork size={14} strokeWidth={1.5} />
          Network
        </button>
      </div>

      <div className="panel-content">
        {getTabContent()}
      </div>
    </StyledWrapper>
  );
};

export default RequestDetailsPanel;

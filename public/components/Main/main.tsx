  /*
 *   Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 *
 *   Licensed under the Apache License, Version 2.0 (the "License").
 *   You may not use this file except in compliance with the License.
 *   A copy of the License is located at
 *
 *       http://www.apache.org/licenses/LICENSE-2.0
 *
 *   or in the "license" file accompanying this file. This file is distributed
 *   on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either
 *   express or implied. See the License for the specific language governing
 *   permissions and limitations under the License.
 */

import React from "react";
import { EuiSpacer } from "@elastic/eui";
import { IHttpResponse, IHttpService } from "angular";
import _ from "lodash";
import Header from "../Header/Header";
import QueryEditor from "../QueryEditor/QueryEditor";
import QueryResults from "../QueryResults/QueryResults";
import { getQueries, getDefaultTabId, getDefaultTabLabel, getSelectedResults, Tree } from "../../utils/utils";
import { MESSAGE_TAB_LABEL } from "../../utils/constants";

interface ResponseData {
  ok: boolean;
  resp: any;
}

export interface ResponseDetail<T> {
  fulfilled: boolean;
  errorMessage?: string;
  data?: T;
}

export type TranslateResult = { [key: string]: any };

export interface QueryMessage {
  text: any;
  className: string;
}

export type QueryResult = {
  fields: string[];
  records: { [key: string]: any }[];
  message: string;
};

export interface Tab {
  id: string;
  name: string;
  disabled: boolean;
}

export type ItemIdToExpandedRowMap = {[key: string]:{
  nodes: Tree;
  expandedRow?: {};
  selectedNodes?: {[key: string]: any};
}};

interface MainProps {
  httpClient: IHttpService;
  sqlQueriesString?: string;
}

interface MainState {
  queries: string[];
  queryTranslations: Array<ResponseDetail<TranslateResult>>;
  queryResultsTable: Array<ResponseDetail<QueryResult>>;
  queryResults: Array<ResponseDetail<string>>;
  queryResultsJDBC: Array<ResponseDetail<string>>;
  queryResultsCSV: Array<ResponseDetail<string>>;
  selectedTabName: string;
  selectedTabId: string;
  searchQuery: string;
  itemIdToExpandedRowMap: ItemIdToExpandedRowMap;
  messages: Array<QueryMessage>;
}

const SUCCESS_MESSAGE = "Successfull";

// It gets column names and row values to display in a Table from the json API response
export function getQueryResultsForTable(queryResultsRaw: ResponseDetail<string>[]): ResponseDetail<QueryResult>[] {
  return queryResultsRaw.map(
    ( queryResultResponseDetail: ResponseDetail<string> ): ResponseDetail<QueryResult> => {
      if (!queryResultResponseDetail.fulfilled) {
        return {
          fulfilled: queryResultResponseDetail.fulfilled,
          errorMessage: queryResultResponseDetail.errorMessage
        };
      } else {
        let databaseRecords: { [key: string]: any }[] = [];
        const responseObj = queryResultResponseDetail.data ? JSON.parse(queryResultResponseDetail.data) : '';
        const hits = _.get(responseObj, "hits[hits]", []);
        let databaseFields: string[] = [];
        if (hits.length > 0) {
          databaseFields=(Object.keys(hits[0]["_source"]));
          databaseFields.unshift("id");
        }

        for (let i = 0; i < hits.length; i += 1) {
          const values = hits[i] != null ? Object.values(hits[i]["_source"]) : "";
          const databaseRecord: { [key: string]: any } = {};

          //Add row id
          databaseRecord["id"] = i;
          for (let j = 0; j < values.length; j += 1) {
            const field: string = databaseFields[j+1]; // databaseFields has an extra value for "id"
            databaseRecord[field] = values[j];
          }
          databaseRecords.push(databaseRecord);
        }

        return {
          fulfilled: queryResultResponseDetail.fulfilled,
          data: {
            fields: databaseFields,
            records: databaseRecords,
            message: SUCCESS_MESSAGE
          }
        };
      }
    }
  );
}

export class Main extends React.Component<MainProps, MainState> {
  httpClient: IHttpService;
  // httpClient: any;

  constructor(props: MainProps) {
    super(props);

    this.state = {
      queries: [],
      queryTranslations: [],
      queryResultsTable: [],
      queryResults: [],
      queryResultsJDBC: [],
      queryResultsCSV: [],
      selectedTabName: MESSAGE_TAB_LABEL,
      selectedTabId: MESSAGE_TAB_LABEL,
      searchQuery: " ",
      itemIdToExpandedRowMap: {},
      messages: []
    };

    this.httpClient = this.props.httpClient;
  }

  processTranslateResponse(response: IHttpResponse<ResponseData>): ResponseDetail<TranslateResult> {
      if(!response){
        return{
          fulfilled: false,
          errorMessage: "no response",
          data: undefined
        }
      }
    if (!response.data.ok) {
      return {
        fulfilled: false,
        errorMessage: response.data.resp,
        data: undefined
      };
    }
    return {
      fulfilled: true,
      data: response.data.resp
    };
  }

  processQueryResponse(response: IHttpResponse<ResponseData>): ResponseDetail<string> {
    if(!response){
      return{
        fulfilled: false,
        errorMessage: "no response",
        data: ''
      }
    }
    if (!response.data.ok) {
      return {
        fulfilled: false,
        errorMessage: response.data.resp,
        data: ''
      };
    }

    return {
      fulfilled: true,
      data: response.data.resp
    };
  }

  onSelectedTabIdChange = (tab: Tab): void => {
    this.setState({
      selectedTabId: tab.id,
      selectedTabName: tab.name,
      searchQuery: " ",
      itemIdToExpandedRowMap: {}
    });
  };

  onQueryChange = ({query}: {query : any}) => {
    // Reset pagination state.
    this.setState({
      searchQuery: query,
      itemIdToExpandedRowMap: {},
    });
  };

  updateExpandedMap = (map: ItemIdToExpandedRowMap): void => {
    this.setState({ itemIdToExpandedRowMap: map });
  };

  // It returns the error or successfull message to display in the Message Tab
  getMessage( queryResultsForTable: ResponseDetail<QueryResult>[] ): Array<QueryMessage> {
    const messages = queryResultsForTable.map(queryResult => {
      return {

        text: queryResult.fulfilled && queryResult.data ? queryResult.data.message : queryResult.errorMessage ,
        className: queryResult.fulfilled ? "successful-message" : "error-message"
      };
    });
    return messages;
  }

  onRun = (queriesString: string): void => {
    const queries: string[] = getQueries(queriesString);

    if (queries.length > 0) {
      const queryTranslationsPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/translate", { query })
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      );

      const queryResultsPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/query", { query })
            .catch((error: any) => {
              this.setState({
                messages: [
                  {
                    text: error.message,
                    className: "error-message"
                  }
                ]
              });
            })
        )
      );

      const queryResultsJDBCPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/queryjdbc", { query })
            .catch((error: any) => {
              this.setState({
                messages: [{ text: error.message, className: "error-message" }]
              });
            })
        )
      );

      const queryResultsCSVPromise = Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/querycsv", { query })
            .catch((error: any) => {
              this.setState({
                messages: [{ text: error.message, className: "error-message" }]
              });
            })
        )
      );

      Promise.all([
        queryTranslationsPromise,
        queryResultsPromise,
        queryResultsJDBCPromise,
        queryResultsCSVPromise
      ]).then(
        ([
          queryTranslationsResponse,
          queryResultsResponse,
          queryResultsJDBCResponse,
          queryResultsCSVResponse
        ]) => {
          const queryResults: ResponseDetail<string>[] = queryResultsResponse.map(queryResultResponse =>
            this.processQueryResponse(queryResultResponse as IHttpResponse<ResponseData>)
          );
          const queryResultsForTable: ResponseDetail<QueryResult>[] = getQueryResultsForTable(queryResults);
          const queryResultsJDBC: ResponseDetail<string>[] = queryResultsJDBCResponse.map(queryJDBCResultResponse =>
            this.processQueryResponse(queryJDBCResultResponse as IHttpResponse<
              ResponseData
            >)
          );
          const queryResultsCSV: ResponseDetail<string>[] = queryResultsCSVResponse.map(queryCSVResultResponse =>
            this.processQueryResponse(queryCSVResultResponse as IHttpResponse<
              ResponseData
            >)
          );

          this.setState({
            queries,
            queryTranslations: queryTranslationsResponse.map(
              translatedQueryResponse =>
                this.processTranslateResponse(
                  translatedQueryResponse as IHttpResponse<ResponseData>
                )
            ),
            queryResultsTable: queryResultsForTable,
            queryResults: queryResults,
            queryResultsJDBC: queryResultsJDBC,
            queryResultsCSV: queryResultsCSV,
            selectedTabId: getDefaultTabId(queryResults),
            selectedTabName: getDefaultTabLabel(queryResults, queries[0]),
            messages: this.getMessage(queryResultsForTable),
            itemIdToExpandedRowMap: {},
            searchQuery: " "
          });

        }
      );
    } else {
      // If there are no queries, it cleans the editors from previous results
      this.onClear();
    }
  };

  onTranslate = (queriesString: string): void => {
    const queries: string[] = getQueries(queriesString);
    if (queries.length > 0) {
      Promise.all(
        queries.map((query: string) =>
          this.httpClient
            .post("../api/sql_console/translate", { query })
            .catch((error: any) => ({ ok: false, resp: error.message }))
        )
      ).then(queryTranslationsResponse => {
        this.setState({
          queries,
          queryTranslations: queryTranslationsResponse.map(
            translatedQueryResponse =>
              this.processTranslateResponse(
                translatedQueryResponse as IHttpResponse<ResponseData>
              )
          ),
          queryResultsTable: [],
          queryResults: [],
          queryResultsJDBC: [],
          queryResultsCSV: [],
          messages: [{ text: "", className: "" }],
          selectedTabId: MESSAGE_TAB_LABEL,
          selectedTabName: MESSAGE_TAB_LABEL,
          itemIdToExpandedRowMap: {}
        });
      });
    }
  };

  onClear = (): void => {
    this.setState({
      queryTranslations: [],
      queryResultsTable: [],
      queryResults: [],
      queryResultsCSV: [],
      queryResultsJDBC: [],
      messages: [],
      selectedTabId: MESSAGE_TAB_LABEL,
      selectedTabName: MESSAGE_TAB_LABEL,
      itemIdToExpandedRowMap: {}
    });
  };

  render() {
    return (
      <div>
        <Header />
        <div className="sql-console-query-container">
          <div className="sql-console-query-editor">
            <QueryEditor
              onRun={this.onRun}
              onTranslate={this.onTranslate}
              onClear={this.onClear}
              sqlQueriesString={this.props.sqlQueriesString ? this.props.sqlQueriesString : '' }
              queryTranslations={this.state.queryTranslations}
            />
          </div>

          <EuiSpacer size="l" />
          <div className="sql-console-query-result">
            <QueryResults
              queries={this.state.queries}
              queryResults={this.state.queryResultsTable}
              queryResultsRaw={getSelectedResults(this.state.queryResults, this.state.selectedTabId)}
              queryResultsJDBC={getSelectedResults(this.state.queryResultsJDBC, this.state.selectedTabId)}
              queryResultsCSV={getSelectedResults(this.state.queryResultsCSV, this.state.selectedTabId)}
              messages={this.state.messages}
              selectedTabId={this.state.selectedTabId}
              selectedTabName={this.state.selectedTabName}
              onSelectedTabIdChange={this.onSelectedTabIdChange}
              itemIdToExpandedRowMap={this.state.itemIdToExpandedRowMap}
              onQueryChange={this.onQueryChange}
              updateExpandedMap={this.updateExpandedMap}
              searchQuery={this.state.searchQuery}
              tabsOverflow={false}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default Main;
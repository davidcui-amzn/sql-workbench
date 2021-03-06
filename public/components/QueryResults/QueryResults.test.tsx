/*
 *   Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
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
import "regenerator-runtime";
import "mutationobserver-shim";
import "@testing-library/jest-dom/extend-expect";
import { render, fireEvent, configure } from "@testing-library/react";
import { mockQueryResults, mockQueries } from "../../../test/mocks/mockData";
import { MESSAGE_TAB_LABEL } from "../../utils/constants";
import QueryResults from "./QueryResults";
import { Tab, ItemIdToExpandedRowMap, ResponseDetail, QueryResult } from "../Main/main";

configure({testIdAttribute: 'data-test-subj'});

function renderQueryResults(mockQueryResults : ResponseDetail<QueryResult>[],
                            mockQueries : string[] = [],
                            mockSearchQuery : string = '',
                            onSelectedTabIdChange : (tab: Tab) => void,
                            onQueryChange : () => {},
                            updateExpandedMap : (map:ItemIdToExpandedRowMap) => {},
                            getJson: (queries: string[]) => void,
                            getJdbc: (queries: string[]) => void,
                            getCsv: (queries: string[]) => void,
                            getText: (queries: string[]) => void ){

    return {
        ...render(
            <QueryResults
        queries={mockQueries}
        queryResults={mockQueryResults}
        queryResultsJDBC={''}
        queryResultsJSON={''}
        queryResultsCSV={''}
        queryResultsTEXT={''}
        messages={[]}
        selectedTabId={'0'}
        selectedTabName={MESSAGE_TAB_LABEL}
        onSelectedTabIdChange={onSelectedTabIdChange}
        itemIdToExpandedRowMap={{}}
        onQueryChange={onQueryChange}
        updateExpandedMap={updateExpandedMap}
        searchQuery={mockSearchQuery}
        tabsOverflow={true}
        getJson={getJson}
        getJdbc={getJdbc}
        getCsv={getCsv}
        getText={getText}
      />
        ),
    };
}


describe("<QueryResults /> spec", () => {
  const onSelectedTabIdChange = jest.fn();
  const onQueryChange = jest.fn();
  const updateExpandedMap = jest.fn();
  const getRawResponse = jest.fn();
  const getJdbc = jest.fn();
  const getCsv = jest.fn();
  const getText = jest.fn();

  it("renders the component with no data", async () => {
    (window as any).HTMLElement.prototype.scrollBy = function() {};
    const { getAllByText, getAllByRole } = renderQueryResults([], [],'',
      onSelectedTabIdChange, onQueryChange, updateExpandedMap, getRawResponse, getJdbc, getCsv, getText);

    expect(document.body.children[0]).toMatchSnapshot();

    // It tests there is only Messages tab
    expect(getAllByText(MESSAGE_TAB_LABEL)).toHaveLength(1);
    expect(getAllByRole('tab')).toHaveLength(1);
  });
});

describe("<QueryResults with data/> spec", () => {
  const onSelectedTabIdChange = jest.fn();
  const onQueryChange = jest.fn();
  const updateExpandedMap = jest.fn();
  const mockSearchQuery = "";
  const getRawResponse = jest.fn();
  const getJdbc = jest.fn();
  const getCsv = jest.fn();
  const getText = jest.fn();
  (window as any).HTMLElement.prototype.scrollBy = jest.fn();

  it("renders the component with mock query results", async () => {
    const {getAllByRole, getByText, getAllByText, getAllByTestId, getAllByLabelText} =
      renderQueryResults(mockQueryResults, mockQueries, mockSearchQuery, onSelectedTabIdChange, onQueryChange,
        updateExpandedMap, getRawResponse, getJdbc, getCsv, getText);

    expect(document.body.children[0]).toMatchSnapshot();

    // It tests scrolling arrows
    expect(getAllByTestId('slide-right'));
    await fireEvent.click(getAllByTestId('slide-right')[0]);

    // It tests that the selected tab is the first tab with results
    expect(getAllByRole('tab')[0].getAttribute('aria-selected')).toEqual('false');
    expect(getAllByRole('tab')[1].getAttribute('aria-selected')).toEqual('true');

    //It tests that there is one tab for each QueryResult
    expect(getAllByRole('tab')).toHaveLength(11);

    // It tests Tab button
    await fireEvent.click(getAllByRole('tab')[5]);

    // It tests that the Tab label is the index of the query
    expect(getByText("index_1"));

    // It tests sorting
    await fireEvent.click(getAllByTestId('tableHeaderSortButton')[1]);

    // It tests pagination
    await fireEvent.click(getAllByLabelText('Page 2 of 2')[0]);
    await fireEvent.click(getAllByText('Rows per page', {exact: false})[0]);
    expect(getByText("10 rows"));
    expect(getByText("20 rows"));
    expect(getByText("50 rows"));
    expect(getByText("100 rows"));
    await fireEvent.click(getByText("20 rows"));
  });

  it("renders the component to test tabs right arrow", async () => {
    const {getAllByTestId} = renderQueryResults(mockQueryResults, mockQueries, mockSearchQuery, onSelectedTabIdChange,
      onQueryChange, updateExpandedMap, getRawResponse, getJdbc, getCsv, getText);

    expect(document.body.children[0]).toMatchSnapshot();

    // It tests right scrolling arrows
    expect(getAllByTestId('slide-right'));
    await fireEvent.click(getAllByTestId('slide-right')[0]);
  });

  it("renders the component to test tabs down arrow", async () => {
    const {getAllByTestId} = renderQueryResults(mockQueryResults, mockQueries, mockSearchQuery, onSelectedTabIdChange,
      onQueryChange, updateExpandedMap, getRawResponse, getJdbc, getCsv, getText);

    expect(document.body.children[0]).toMatchSnapshot();

    // It tests right scrolling arrows
    expect(getAllByTestId('slide-down'));
    await fireEvent.click(getAllByTestId('slide-down')[0]);
  });

});

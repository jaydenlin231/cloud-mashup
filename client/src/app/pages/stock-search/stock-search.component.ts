import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { IDropdownSettings } from 'ng-multiselect-dropdown';

@Component({
  selector: 'app-stock-search',
  templateUrl: './stock-search.component.html',
  styleUrls: ['./stock-search.component.css'],
})
export class StockSearchComponent implements OnInit {
  constructor(
    private http: HttpClient,
    private cd: ChangeDetectorRef,
  ) {}
  isLoading: boolean = false;
  pageViewCounter: number | any;

  // Available search items list
  topicsList: any[] = [];
  tickersList: any[] = [];

  // Selected search items list
  selectedTickers: any[] = [];
  selectedTopics: any[] = [];

  // Article models to display
  directResultsArray: any[] = [];
  relatedResultsArray: any[] = [];

  tickersDropdownSettings: IDropdownSettings = {};
  topicsDropdownSettings: IDropdownSettings = {};

  // Switch mode models
  isMultiTickersSearchMode: boolean = false;
  isSmartTickersSearchMode: boolean = true;
  isSmartTopicsSearchMode: boolean = true;

  queryTickersString: string = '';
  queryTopicsString: string = '';

  // Response model retrived from /api/search
  theModel: any;

  ngOnInit(): void {
    // TO DO - refactor to service
    this.topicsList = [
      { queryString: 'blockchain', labelText: 'Blockchain' },
      { queryString: 'earnings', labelText: 'Earnings' },
      { queryString: 'ipo', labelText: 'IPO' },
      { queryString: 'mergers_and_acquisitions', labelText: 'Mergers' },
      { queryString: 'financial_markets', labelText: 'Financial Markets' },
      { queryString: 'economy_fiscal', labelText: 'Fiscal Policy' },
      { queryString: 'economy_monetary', labelText: 'Monetary Policy' },
      { queryString: 'economy_macro', labelText: 'TechnologyMacro/Overall' },
      { queryString: 'energy_transportation', labelText: 'Energy' },
      { queryString: 'finance', labelText: 'Finance' },
      { queryString: 'life_sciences', labelText: 'Life Sciences' },
      { queryString: 'manufacturing', labelText: 'Manufacturing' },
      { queryString: 'real_estate', labelText: 'Real Estate' },
      { queryString: 'retail_wholesale', labelText: 'Retail' },
      { queryString: 'technology', labelText: 'Technology' },
    ];
    this.tickersDropdownSettings = {
      singleSelection: false,
      idField: 'queryString',
      textField: 'labelText',
      allowSearchFilter: true,
      limitSelection: 3,
    };
    this.topicsDropdownSettings = {
      singleSelection: false,
      idField: 'queryString',
      textField: 'labelText',
      allowSearchFilter: true,
      allowRemoteDataSearch: true,
      limitSelection: 3,
    };

    this.getPageViewCounter();
    this.populateStockTickersMultiSelectDropdownList();
    this.cd.detectChanges();
  }

  // Trigger manual change detection
  detectChanges() {
    this.cd.detectChanges();
  }

  onTickersMultiDropdownDeselect() {
    this.queryTickersString = '';
    this.detectChanges();
  }

  onTopicsMultiDropdownDeselect() {
    this.queryTopicsString = '';
    this.detectChanges();
  }

  getStockSearchResults() {
    this.theModel = null;
    this.isLoading = true;

    if (this.isSmartTickersSearchMode)
      // Convert Ticker Tags in multi select dropdown to query string
      this.queryTickersString = this.arrayToQueryString(this.selectedTickers);

    if (this.isSmartTopicsSearchMode)
      // Convert Topic Tags in multi select dropdown to query string
      this.queryTopicsString = this.arrayToQueryString(this.selectedTopics);

    let params = new HttpParams();

    // Optionally append tickers query param
    if (this.queryTickersString !== '')
      params = params.append('tickers', this.queryTickersString);
    // Optionally append topics query param
    if (this.queryTopicsString !== '')
      params = params.append('topics', this.queryTopicsString);

    params = params.append('isMulti', this.isMultiTickersSearchMode);

    const endpoint = '/api/search';

    this.http.get<any>(endpoint, { params }).subscribe({
      next: (res) => this.searchReturnedResult(res),
      error: (res) => this.searchReturnedError(res),
    });
    this.cd.detectChanges();
  }

  onClearButtonClick() {
    // Clear query params
    this.theModel = null;
    this.selectedTickers = [];
    this.selectedTopics = [];
    this.queryTickersString = '';
    this.queryTopicsString = '';
    this.cd.detectChanges();
  }

  searchReturnedResult(response: any) {
    // update model
    this.theModel = response;
    this.isLoading = false;
    // categorise article results
    this.directResultsArray = this.processDirectResultsArray(response);
    this.relatedResultsArray = this.processRelatedResultsArray(response);
  }

  searchReturnedError(response: any) {
    this.isLoading = false;
    // TO DO - Error handling
    console.log(response);
  }

  processDirectResultsArray(response: any) {
    let directResultArray: any[] = [];
    if (response.queryTickers) {
      // Include direct query stock tickers in direct results
      response['tickerFeed'].forEach((tickerObj: any) => {
        if (response.queryTickers.includes(tickerObj.ticker))
          directResultArray.push(tickerObj);
      });
    } else {
      directResultArray = response['tickerFeed'];
    }
    return directResultArray;
  }

  processRelatedResultsArray(response: any) {
    let relatedResultsArray: any[] = [];
    if (response.queryTickers) {
      // Include related stock tickers to direct query stocks in related results
      response['tickerFeed'].forEach((tickerObj: any) => {
        if (!response.queryTickers.includes(tickerObj.ticker))
          relatedResultsArray.push(tickerObj);
      });
    } else {
      relatedResultsArray = [];
    }
    return relatedResultsArray;
  }

  // Convert multi select dropdown tag objects to query string
  arrayToQueryString(selectedObjArray: any[]) {
    let queryStringArray: string[] = [];
    selectedObjArray.forEach((obj) => {
      queryStringArray.push(obj.queryString);
    });
    return queryStringArray.join(',');
  }

  onSmartTickerSearchSwitchChange() {
    // Reset stocker tickers query
    this.queryTickersString = '';
    this.selectedTickers = [];
  }

  onSmartTopicSearchSwitchesChange() {
    // Reset new topics query
    this.queryTopicsString = '';
    this.selectedTopics = [];
  }

  onMultiTickersSearchSwitchesChange() {
    this.detectChanges();
  }

  isSearchDisabled() {
    return (
      // Search is disabled if in multi ticker search and query tickers <= 1
      this.isMultiTickersSearchMode &&
      this.queryTickersString === '' &&
      this.selectedTickers.length <= 1
    );
  }

  getPageViewCounter() {
    const endpoint = '/api/page-view-counter';

    this.http.get<any>(endpoint).subscribe({
      next: (res) => this.pageViewCountReturnedResult(res),
      error: (res) => this.pageViewCountReturnedError(res),
    });
  }

  pageViewCountReturnedResult(response: any) {
    // Update page view counter for display
    this.pageViewCounter = parseInt(response.pageViewCounter);
  }

  pageViewCountReturnedError(response: any) {
    // TO DO - Error handling
    console.log(response);
  }

  populateStockTickersMultiSelectDropdownList() {
    const endpoint = '/api/symbol';
    this.http.get<any>(endpoint).subscribe({
      next: (res) => this.getStockSymbolsReturnedResult(res),
      error: (res) => this.getStockSymbolsReturnedError(res),
    });
  }

  getStockSymbolsReturnedError(response: any) {
    // TO DO - Error handling
    console.log(response);
  }

  getStockSymbolsReturnedResult(result: any) {
    let tickersList: any[] = [];

    for (let index = 0; index < result.length; index++) {
      const symbolObj = result[index];
      // Map r/WSB Top 50 Mentioned stocks reseults to multi select dropdown
      tickersList.push({
        queryString: symbolObj.ticker,
        labelText: symbolObj.ticker,
      });
    }
    this.detectChanges();
    this.tickersList = tickersList;
  }
}

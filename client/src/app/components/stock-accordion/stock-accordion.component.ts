import { Component, Input, OnInit } from '@angular/core';
import { faRedditAlien, faTwitter } from '@fortawesome/free-brands-svg-icons';

@Component({
  selector: 'app-stock-accordion',
  templateUrl: './stock-accordion.component.html',
  styleUrls: ['./stock-accordion.component.css']
})
export class StockAccordionComponent implements OnInit {
  @Input() tickerObj: any;
  @Input() isLast: boolean = false;

  faRedditAlien = faRedditAlien;
  faTwitter = faTwitter;
  topThreeTopics: any[] = [];

  constructor() { }

  ngOnInit(): void {
  }

  // Sort topics array by topic relevance score
  sortTopicsArray(articleObj: any){
    if(articleObj.topics !==undefined && articleObj.topics.length > 0){
      return articleObj.topics.sort((a: any, b: any) => b.relevance_score - a.relevance_score)
    }
  }

  // Get Date Time String for display
  getLocaleDateTimeString(dateTimeISOString: string){
    let date = new Date(dateTimeISOString);
    return date.toString();
  }

}

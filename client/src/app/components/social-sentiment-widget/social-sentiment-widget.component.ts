import { Component, Input, OnInit } from '@angular/core';

@Component({
  selector: 'app-social-sentiment-widget',
  templateUrl: './social-sentiment-widget.component.html',
  styleUrls: ['./social-sentiment-widget.component.css']
})
export class SocialSentimentWidgetComponent implements OnInit {
  @Input() socialMedia: string = "";
  @Input() sentimentObject: any;

  constructor() { }

  isLoading:boolean = false;
  mention: number = 0;
  positiveMention: number = 0;
  negativeMention: number = 0;
  score: number = 0;

  // Extract fields from input sentiment object upon component init
  extractFields(){
    this.mention = this.sentimentObject["mention"];
    this.positiveMention = this.sentimentObject["positiveMention"];
    this.negativeMention = this.sentimentObject["negativeMention"];
    this.score = this.sentimentObject["score"];
  }

  ngOnInit(): void {
    if(this.sentimentObject === null)
      return;

    this.isLoading = true;
    this.extractFields();
    this.isLoading = false;
  }

}

import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SocialSentimentWidgetComponent } from './social-sentiment-widget.component';

describe('SocialSentimentWidgetComponent', () => {
  let component: SocialSentimentWidgetComponent;
  let fixture: ComponentFixture<SocialSentimentWidgetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ SocialSentimentWidgetComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SocialSentimentWidgetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

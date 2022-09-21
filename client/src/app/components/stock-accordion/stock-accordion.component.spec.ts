import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StockAccordionComponent } from './stock-accordion.component';

describe('StockAccordionComponent', () => {
  let component: StockAccordionComponent;
  let fixture: ComponentFixture<StockAccordionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ StockAccordionComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(StockAccordionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});

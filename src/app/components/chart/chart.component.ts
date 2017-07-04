import { Component, OnInit } from '@angular/core';

declare var tickp: any;
declare var moment: any;

@Component({
  selector: 'app-chart',
  templateUrl: './chart.component.html',
  styleUrls: ['./chart.component.css']
})
export class ChartComponent implements OnInit {

  chart: any;
  theme: any;


  constructor() {
    this.theme = {
                background: '#111216',
                label: '#EEEEEE',
                //stroke: '#38393e',
                stroke: '#989898',
                trendline: '#AAAAAA',
                gridlines: '#555555',
                macdhist: '#AAAAAA',
                //crosshair: '#7777FF',
                crosshair: '#f1f1f1',
                currentvalueindicator: '#FF0000',
                currentPriceLine:'#0090ff',
                currentPriceBackground:'#0090ff',
                overlays: ['#CB2BC6', '#5217DB', '#18E197', '#DED71F', '#DE521F', '#10F5B8', '#A6ACE2', '#DF9FB0'],
                bbands: ['#aabbcc', '#aabbcc', '#aabbcc'],
                macd: ['#0000FF', '#FF0000', '#aabbcc'],
                psar: '#CCFFFF',
                rcandle: '#e14928',
                gcandle: '#21ad38',
                lineplot: '#CCCCCC',
                idcss: 'position:absolute; border: 2px solid #0066CC; background: #FFFFCC;font-size:10px;font-family:"Helvetica Neue", Helvetica, Arial, sans-serif;text-align:center;width:80px;height:100px; padding:2px;',
                oloffset: 0,
                font: '11px Helvetica Neue, Helvetica, Arial',
                extremeFont: 'Bold 11px Helvetica Neue, Helvetica, Arial',
                extremeDash: [5],
                extremeRangeTransparency: 0.1,
                extremeRangeColor:'#fff',
                indicatorTitleColor: '#fff',
                maxYlines: 10,
                maxIndicators: 10
            }
    };

  ngOnInit() {
    const chartEl = document.getElementsByClassName('chart')[0];
    // const chartWidth = chartEl.clientWidt;
    // const chartHeight = chartEl.clientHeigh;
    const chartWidth = 800;
    const chartHeight = 600;
    this.chart = tickp(chartEl, {theme: this.theme, moment: moment});
    // this.chart = tickp(chartEl, {theme: chartThemes.dark, moment: moment});
    // console.log(this.chart);
    this.chart.setSize(chartWidth, chartHeight);
    
  }

}

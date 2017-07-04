define(
    function () {
        return {
            dark: {
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
            },
            light: {
                background: '#FBFBFB',
                label: '#080808',
                stroke: '#0B0B0B',
                gridlines: '#111111',
                crosshair: '#7777FF',
                trendline: '#0B0B0B',
                macdhist: '#0B0B0B',
                currentvalueindicator: '#880000',
                overlays: ['#CB2BC6', '#5217DB', '#18E197', '#DED71F', '#DE521F', '#10F5B8', '#A6ACE2', '#DF9FB0'],
                bbands: ['#001122', '#001122', '#001122'],
                macd: ['#000088', '#880000', '#aabbcc'],
                psar: '#000099',
                rcandle: '#880000',
                gcandle: '#008800',
                lineplot: '#333333',
                idcss: 'position:absolute; border: 2px solid #0066CC; background: #FFFFCC;font-size:10px;font-family:Roboto;text-align:center;width:80px;height:100px; padding:2px;',
                oloffset: 0,
                font: '10px Roboto',
                extremeFont: 'Bold 11px Helvetica Neue',
                extremeDash: [5],
                extremeRangeTransparency: 0.4
            }
        };
    });

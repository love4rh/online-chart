import React, { Component } from 'react';

import * as d3 from 'd3';

import './LineTooltipChart.scss';


// https://github.com/adamjanes/udemy-d3/blob/master/06/6.10.0/js/main.js
class LineTooltipChart extends Component {
    constructor(props) {
      super(props);

      const MARGIN = { LEFT: 100, RIGHT: 100, TOP: 50, BOTTOM: 100 };
      const WIDTH = 800 - MARGIN.LEFT - MARGIN.RIGHT;
      const HEIGHT = 500 - MARGIN.TOP - MARGIN.BOTTOM;

      this.state = {
        MARGIN, WIDTH, HEIGHT,
        valueType: 'price_usd',
        coinType: 'bitcoin',
        chartElement: {}
      };

      this._chartDiv = React.createRef();
    }
    
    componentDidMount() {
      this.initializeD3Area();
    }
  
    componentWillUnmount() {
      if( this._interval ) {
        this._interval.stop();
      }
    }

    initializeD3Area = () => {
      const { MARGIN, WIDTH, HEIGHT } = this.state;

      const svg = d3.select(this._chartDiv.current).append("svg")
        .attr("width", WIDTH + MARGIN.LEFT + MARGIN.RIGHT)
        .attr("height", HEIGHT + MARGIN.TOP + MARGIN.BOTTOM);

      const g = svg.append("g")
        .attr("transform", `translate(${MARGIN.LEFT}, ${MARGIN.TOP})`);

      this._g = g;

      const parseTime = d3.timeParse("%d/%m/%Y");
      const formatTime = d3.timeFormat("%d/%m/%Y");
      // for tooltip
      const bisectDate = d3.bisector(d => d.date).left;

      // add the line for the first time
      g.append("path")
        .attr("class", "line")
        .attr("fill", "none")
        .attr("stroke", "grey")
        .attr("stroke-width", "3px");

      // x axis labels
      g.append("text")
        .attr("class", "x axisLabel")
        .attr("y", HEIGHT + 50)
        .attr("x", WIDTH / 2)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Time");

      // y axis labels
      const yLabel = g.append("text")
        .attr("class", "y axisLabel")
        .attr("transform", "rotate(-90)")
        .attr("y", -60)
        .attr("x", -170)
        .attr("font-size", "20px")
        .attr("text-anchor", "middle")
        .text("Price ($)");

      // scales
      const x = d3.scaleTime().range([0, WIDTH]);
      const y = d3.scaleLinear().range([HEIGHT, 0]);

      // axis generators
      const xAxisCall = d3.axisBottom();
      const yAxisCall = d3.axisLeft()
        .ticks(6)
        .tickFormat(d => `${parseInt(d / 1000)}k`);

      // axis groups
      const xAxis = g.append("g")
        .attr("class", "x axis")
        .attr("transform", `translate(0, ${HEIGHT})`);

      const yAxis = g.append("g")
        .attr("class", "y axis");

      this.setState({ chartElement:
        { parseTime, formatTime, bisectDate, x, y, xAxisCall, yAxisCall, xAxis, yAxis, yLabel }
      });

      d3.json("https://raw.githubusercontent.com/adamjanes/udemy-d3/master/06/6.10.1/data/coins.json")
        .then(this.handleData);
    }

    handleData = (data) => {
      const { chartElement } = this.state;
      const { parseTime } = chartElement;

      let filteredData = {};

      Object.keys(data).forEach(coin => {
        filteredData[coin] = data[coin]
          .filter(d => !(d["price_usd"] === null))
          .map(d => {
            d["price_usd"] = Number(d["price_usd"]);
            d["24h_vol"] = Number(d["24h_vol"]);
            d["market_cap"] = Number(d["market_cap"]);
            d["date"] = parseTime(d["date"]);
            return d;
          });
      });

      this.setState({ filteredData });
      this.updateDS3Chart();
    }

    updateDS3Chart = () => {
      const { coinType, valueType, filteredData, chartElement, WIDTH, HEIGHT, MARGIN } = this.state;
      const { parseTime, bisectDate, x, y, xAxisCall, yAxisCall, xAxis, yAxis, yLabel } = chartElement;

      const t = d3.transition().duration(1000);
      const range = [parseTime("1/1/2014"), parseTime("31/12/2015")];

      const dataTimeFiltered = filteredData[coinType].filter(d => {
        return ((d.date >= range[0]) && (d.date <= range[1]))
      })
    
      x.domain(d3.extent(dataTimeFiltered, d => d.date));

      y.domain([
        d3.min(dataTimeFiltered, d => d[valueType]) / 1.005,
        d3.max(dataTimeFiltered, d => d[valueType]) * 1.005
      ]);

      const formatSi = d3.format(".2s");

      xAxisCall.scale(x);
      xAxis.transition(t).call(xAxisCall)
        .selectAll("text")
        .attr("y", "10")
        .attr("x", "-5")
        .attr("text-anchor", "end")
        .attr("transform", "rotate(-45)");

      yAxisCall.scale(y);
      yAxis.transition(t).call(yAxisCall.tickFormat((xv) => {
        const s = formatSi(xv);
        switch( s[s.length - 1] ) {
          case "G": return s.slice(0, -1) + "B"; // billions
          case "K": return s.slice(0, -1) + "K"; // thousands
          default: break;
        };
        return s;
      }));

      // yAxis.style("display", "none");
    
      d3.select(".focus").remove();
      d3.select(".overlay").remove();

      const g = this._g;
      const focus = g.append("g")
        .attr("class", "focus")
        .style("display", "none");

      focus.append("line")
        .attr("class", "x-hover-line hover-line")
        .attr("y1", 0)
        .attr("y2", HEIGHT);
    
      focus.append("line")
        .attr("class", "y-hover-line hover-line")
        .attr("x1", 0)
        .attr("x2", WIDTH);
    
      focus.append("circle")
        .attr("r", 7.5);
    
      focus.append("text")
        .attr("x", 15)
        .attr("dy", ".31em");
    
      g.append("rect")
        .attr("class", "overlay")
        .attr("width", WIDTH)
        .attr("height", HEIGHT)
        .on("mouseover", () => focus.style("display", null))
        .on("mouseout", () => focus.style("display", "none"))
        .on("mousemove", (ev) => {
          const x0 = x.invert(ev.offsetX - MARGIN.LEFT);
          const i = bisectDate(dataTimeFiltered, x0, 1);
          const d0 = dataTimeFiltered[i - 1];
          const d1 = dataTimeFiltered[i];
          if( !d0 || !d1 ) {
            return;
          }
          const d = x0 - d0.date > d1.date - x0 ? d1 : d0;
          focus.attr("transform", `translate(${x(d.date)}, ${y(d[valueType])})`);
          focus.select("text").text(d[valueType]);
          focus.select(".x-hover-line").attr("y2", HEIGHT - y(d[valueType]));
          focus.select(".y-hover-line").attr("x2", -x(d.date));
        });
      
      // Path generator
      const line = d3.line()
        .x(d => x(d.date))
        .y(d => y(d[valueType]));

      // Update our line path
      g.select(".line")
        .transition(t)
        .attr("d", line(dataTimeFiltered));

      // Update y-axis label
      const newText = (valueType === "price_usd") ? "Price ($)" 
        : (valueType === "market_cap") ? "Market Capitalization ($)" 
        : "24 Hour Trading Volume ($)";

      yLabel.text(newText);
    }

    render() {
      return (
        <div ref={this._chartDiv} />
      )
    }
}


export default LineTooltipChart;
export { LineTooltipChart };

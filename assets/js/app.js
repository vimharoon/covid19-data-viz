let width = document.getElementById('container').offsetWidth * 0.95,
  height = 480,
  legendCellSize = 20,
  colors = ['#C8FCEA','#80ffdb','#72efdd','#64dfdf','#56cfe1','#48bfe3','#4ea8de','#4895ef','#4361ee','#3f37c9','#3a0ca3','#480ca8','#560bad','#7209b7','#b5179e','#f72585'];

const svg = d3.select('#map')
              .append('svg')
              .attr('id', 'svg')
              .attr('width', width)
              .attr('height', height)
              .attr('class', 'svg');

const projection = d3.geoNaturalEarth1().scale(1).translate([0, 0]);

const path = d3.geoPath().pointRadius(2).projection(projection);

svg.append('text')
    .attr('x', width / 2)
    .attr('y', 25)
    .attr('text-anchor', 'middle')
    .style('fill', '#1F0660')
    .style('font-weight', '300')
    .style('font-size', '20px')
    .text('Nombre de cas COVID-19 détecté dans le monde');

const cGroup = svg.append('g');

var promises = [];
promises.push(d3.json('./../../world-countries-no-antartica.json'));
promises.push(d3.csv('./../../covid_quot_pays_modif.csv'));

Promise.all(promises).then(function (values) {
  const geojson = values[0];
  const fullData = values[1];

  const result = fullData
  .sort((a, b) => new Date(b.date) - new Date(a.date))
  .filter((a, _, arr) => a.date.substring(0, 10) === arr[0].date.substring(0, 10));

  var b = path.bounds(geojson),
    s = 0.8 / Math.max((b[1][0] - b[0][0]) / width, (b[1][1] - b[0][1]) / height),
    t = [(width - s * (b[1][0] + b[0][0])) / 2, (height - s * (b[1][1] + b[0][1])) / 2];

  projection.scale(s).translate(t);

  cGroup.selectAll('path')
        .data(geojson.features)
        .enter()
        .append('path')
        .attr('d', path)
        .attr('id', (d) => 'code' + d.id)
        .attr('class', 'country')
        .style('fill', '#4B4453')
        .style('stroke', '#4B4453')
        .style('stroke-width', '0.1');

  const min = d3.min(result, (d) => +d.infections),
        max = d3.max(result, (d) => +d.infections);
  var quantile = d3.scaleQuantile().domain([min, max]).range(colors);
  var legend = addLegend(min, max);
  var tooltip = addTooltip();

  result.forEach(function (e, i) {
    var countryPath = d3.select('#code' + e.countryCode);
    countryPath
      .attr('scorecolor', quantile(+e.infections))
      .style('fill', quantile(+e.infections))
      .on('mouseover', function (d) {
        countryPath.style('fill', '#F9F871');
        tooltip.style('display', null);
        addPieChart(tooltip, [
          {
            country: e.frenchCountry,
            label: 'infections',
            value: e.infections,
          },
          {
            country: e.frenchCountry,
            label: 'recovery',
            value: e.recovery,
          },
        ])
        onCountryChange({ country: e.frenchCountry, countryCode: e.countryCode });
        legend.select('#cursor')
          .attr(
            'transform',
            `translate(${legendCellSize + 5}, ${getColorIndex(quantile(+e.infections)) * legendCellSize})`
          ).style('display', null)
      }).on('mouseout', function (d) {
        countryPath.style('fill', quantile(+e.infections));
        tooltip.style('display', 'none');
        legend.select('#cursor').style('display', 'none');
        rmPieChart();
      }).on('mousemove', function (d) {
        var mouse = d3.pointer(d);
        tooltip.attr('transform', `translate(${mouse[0] + 60}, ${mouse[1] - 10})`);
      });
  });
});

function addLegend(min, max) {
  var legend = svg.append('g').attr('transform', 'translate(80, 50)')
  legend.selectAll()
        .data(d3.range(colors.length))
        .enter()
        .append('svg:rect')
        .attr('height', legendCellSize + 'px')
        .attr('width', legendCellSize + 'px')
        .attr('x', 5)
        .attr('y', (d) => d * legendCellSize)
        .attr('class', 'legend-cell')
        .style('fill', (d) => colors[d])
        .on('mouseover', (d, i) => {
          legend
            .select('#cursor')
            .attr(
              'transform',
              `translate(${legendCellSize + 5}, ${i * legendCellSize})`
            )
            .style('display', null)
          d3.selectAll(`path[scorecolor='${colors[i]}']`).style('fill', '#F9F871')
        })
        .on('mouseout', function (d, i) {
          legend.select('#cursor').style('display', 'none')
          d3.selectAll(`path[scorecolor='${colors[i]}']`).style('fill', colors[i])
        })

  legend.append('svg:rect')
        .attr('y', legendCellSize + colors.length * legendCellSize)
        .attr('height', legendCellSize + 'px')
        .attr('width', legendCellSize + 'px')
        .attr('x', 5)
        .style('fill', '#4B4453');

  legend.append('text')
        .attr('x', 30)
        .attr('y', 35 + colors.length * legendCellSize)
        .style('font-size', '13px')
        .style('color', '#4B4453')
        .style('fill', '#4B4453')
        .text('Données non disponible actuellement pour ces pays')

  legend.append('polyline')
        .attr(
          'points',
          legendCellSize +
            ',0 ' +
            legendCellSize +
            ',' +
            legendCellSize +
            ' ' +
            legendCellSize * 0.2 +
            ',' +
            legendCellSize / 2
        )
        .attr('id', 'cursor')
        .style('display', 'none')
        .style('fill', '#C34A36')

  var legendScale = d3.scaleLinear()
                      .domain([min, max])
                      .range([0, colors.length * legendCellSize])

  legendAxis = legend.append('g')
                      .attr('class', 'axis')
                      .call(d3.axisLeft(legendScale).ticks(10,"s"))

  return legend
}

function addTooltip() {
  var tooltip = svg.append('g') // Group for the whole tooltip
                    .attr('id', 'tooltip')
                    .attr('transform', `translate(${100 / 2}, ${90 / 2})`)
                    .style('display', 'none')

  return tooltip
}

function addPieChart(parent, data) {
  parent.data([data]);
  const radius = Math.min(100, 90) / 2,
        color = d3.scaleOrdinal(['#E74C3C','#7DCEA0']),
        pie = d3.pie().value(function(d) { return d.value });
        arc = d3.arc().innerRadius(0).outerRadius(radius),
        arcs = parent.selectAll('arc').data(pie).enter().append('g').attr('class', 'arc');

  arcs.append('path').attr('fill', (d, i) => color(i)).attr('d', arc);
  arcs.append('text').attr('transform', function(d) {
                d.innerRadius = 0;
                d.outerRadius = 100;
                return `translate(${arc.centroid(d)})`;
            })
            .attr('text-anchor', 'middle')
            .style('font-size', '11px')
            .attr('fill', '#ffffff')
            .text(function(d, i) { return getText(data[i].label) });
}

function getText(txt) {
  return txt === 'recovery' ? 'guéri' : 'contaminé';
}

function rmPieChart() {
  d3.selectAll('.arc').remove();
}

function shortCountryName(country) {
  return country.replace('Démocratique', 'Dem.').replace('République', 'Rep.');
}

function getColorIndex(color) {
  for (var i = 0; i < colors.length; i++) {
    if (colors[i] === color) {
      return i;
    }
  }
  return -1;
}

addSvgLegend1()
function addSvgLegend1() {
  const width = 200,
        height = 400;

  const svgLegend1 = d3.select('#svgLegend1')
                        .append('svg')
                        .attr('width', width)
                        .attr('height', height)
                        .attr('class', 'svg');

  svgLegend1.append('circle')
            .attr('cx', 40)
            .attr('cy', 50)
            .attr('r', 3)
            .style('fill', 'red');
}

addSvgLegend2()
function addSvgLegend2() {
  const width = 200,
        height = 400;

  const svgLegend2 = d3.select('#svgLegend2')
                      .append('svg')
                      .attr('width', width)
                      .attr('height', height)
                      .attr('class', 'svg');

  svgLegend2.append('circle')
            .attr('cx', 40)
            .attr('cy', 50)
            .attr('r', 3)
            .style('fill', 'red');

  var legend = svgLegend2.append('g').attr('transform', 'translate(40, 50)')

  legend.selectAll()
        .data(d3.range(colors.length))
        .enter()
        .append('svg:rect')
        .attr('y', (d) => d * legendCellSize)
        .attr('height', legendCellSize + 'px')
        .attr('width', legendCellSize + 'px')
        .attr('x', 5)
        .style('fill', (d) => colors[d]);
}

addSvgLegend3()
function addSvgLegend3() {
  const width = 200,
        height = 400;

  const svgLegend3 = d3.select('#svgLegend3')
                        .append('svg')
                        .attr('width', width)
                        .attr('height', height)
                        .attr('class', 'svg');

  svgLegend3.append('circle')
            .attr('cx', 40)
            .attr('cy', 50)
            .attr('r', 3)
            .style('fill', 'red');

  var legend = svgLegend3.append('g').attr('transform', 'translate(40, 50)')

  legend.selectAll()
        .data(d3.range(colors.length))
        .enter()
        .append('svg:rect')
        .attr('y', (d) => d * legendCellSize)
        .attr('height', legendCellSize + 'px')
        .attr('width', legendCellSize + 'px')
        .attr('x', 5)
        .style('fill', (d) => colors[d]);

  var legendScale = d3.scaleLinear()
                      .domain([44, 97])
                      .range([0, colors.length * legendCellSize]);

  legendAxis = legend.append('g')
                    .attr('class', 'axis')
                    .call(d3.axisLeft(legendScale));
}

function onCountryChange({ country, countryCode }) {
  d3.select('#country-evol').text(`Evolution de la pandémie au ${country}`);
  getPandemicEvolution(countryCode);
}

/**
 * Timeline chart
 */
const margin = { top: 15, bottom: 30, left: 20, right: 20 }
const size = { w: document.getElementById('container').offsetWidth * 0.95, h: 155 }
const color = { handle: "#a6761d", bar: "#e6ab02" }
const timelineChart = d3.select('#timeline-chart')
                            .append('svg')
                            .attr('width', size.w + margin.left + margin.right)
                            .attr('height', size.h + margin.top + margin.bottom);

  timelineChart.append('text')
              .attr('id', 'country-evol')
              .attr('x', size.w / 2)
              .attr('y', 25)
              .attr('text-anchor', 'middle')
              .style('fill', '#B56AD9')
              .style('font-weight', '300')
              .style('font-size', '18px')
              .text(`Evolution de la pandémie au France`);

const dataList = [];
      dataList.push(d3.csv('./../../covid_quot_pays_modif.csv'));

function getPandemicEvolution(countryCode) {

  if (timelineChart.select('#timeline-chart-data')) {
    timelineChart.select('#timeline-chart-data').remove();
  }

  Promise.all(dataList).then(function timeChart(values) {
    const dataByCountry = getDataByCountry(values[0], countryCode || 'FR');
    const filtredData = groupeDataByDate(dataByCountry);
    const maxValue = d3.max(filtredData.map(d => Number(d.value)));
    const mydata = filtredData.map(item => {
      item.value = Number(percentage(item.value, maxValue));
      return item;
    }).reverse();
    const xScale = d3.scaleBand()
                    .domain(mydata.map(d => d.monthyear))
                    .range([0, size.w])
                    .padding(0.2);

    const yScale = d3.scaleLinear()
                    .domain(d3.extent(mydata, d => d.value))
                    .range([0, size.h]);

    // const triangle = d3.symbol()
    //                   .size(100)
    //                   .type(d3.symbolTriangle);

    const xAxis = d3.axisBottom()
                    .scale(xScale)
                    .tickValues(xScale.domain().filter((d, i) => !(i % 3)));

    const brush = d3.brushX()
                    .handleSize(8)
                    .extent([[0, 0], [size.w, size.h]])
                    //.on('start brush end', brushing);

    const g = timelineChart.append('g')
                          .attr('id', 'timeline-chart-data')
                          .attr('transform', `translate(${margin.left}, ${margin.top})`);

    // x axis
    g.append('g')
      .attr('transform', `translate(0, ${size.h + 5})`)
      .call(d3.axisBottom(xScale))
      .transition()
      .duration(2000);

    g.selectAll('rect')
      .data(mydata)
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', d => xScale(d.monthyear))
      .attr('y', d => size.h - yScale(d.value))
      .attr('width', xScale.bandwidth())
      .attr('height', d => yScale(d.value))
      .attr('fill', color.bar)
      .attr('opacity', 1)
      .transition()
      .duration(2000)
      .attr("x", d => xScale(d.monthyear));

    // const gBrush = g.append('g')
    //                 .call(brush)
    //                 .call(brush.move, [0, size.w])

    // Custom handlers
    // Handle group
    // const gHandles = gBrush.selectAll('g.handles')
    //   .data(['handle--o', 'handle--e'])
    //   .enter()
    //   .append('g')
    //   .attr('class', d => `handles ${d}`)
    //   .attr('fill', color.handle)
    //   .attr('transform', d => {
    //     const x = d == 'handle--o' ? 0 : size.w;
    //     return `translate(${x}, 0)`;
    //   });

    // // Label
    // gHandles.selectAll('text')
    //   .data(d => [d])
    //   .enter()
    //   .append('text')
    //   .attr('text-anchor', 'middle')
    //   .attr('dy', -10)
    //   .text(d => d == 'handle--o' ? d3.min(xScale.domain()) : d3.max(xScale.domain()));

    // // Triangle
    // gHandles.selectAll('.triangle')
    //   .data(d => [d])
    //   .enter()
    //   .append('path')
    //   .attr('class', d => `triangle ${d}`)
    //   .attr('d', triangle)
    //   .attr('transform', d => {
    //     const x = d == 'handle--o' ? -6 : 6,
    //           rot = d == 'handle--o' ? -90 : 90;
    //     return `translate(${x}, ${size.h / 2}) rotate(${rot})`;
    //   });

    // // Visible Line
    // gHandles.selectAll('.line')
    //   .data(d => [d])
    //   .enter()
    //   .append('line')
    //   .attr('class', d => `line ${d}`)
    //   .attr('x1', 0)
    //   .attr('y1', -5)
    //   .attr('x2', 0)
    //   .attr('y2', size.h + 5)
    //   .attr('stroke', color.handle);

    function brushing(event, d) {
      // based on: https://bl.ocks.org/mbostock/6232537
      if (!event.selection && !event.sourceEvent) return;
      const s0 = event.selection ? event.selection : [1, 2].fill(event.sourceEvent.offsetX);
      const d0 = filteredDomain(xScale, ...s0);
      let s1 = s0;

      if (event.sourceEvent && event.type === 'end') {
        s1 = snappedSelection(xScale, d0);
        d3.select(this).transition().call(event.target.move, s1);
      }

      // move handlers
      d3.selectAll('g.handles')
        .attr('transform', d => {
          const x = d == 'handle--o' ? s1[0] : s1[1];
          return `translate(${x}, 0)`;
        });

      // update labels
      d3.selectAll('g.handles').selectAll('text')
        .attr('dx', d0.length > 1 ? 0 : 6)
        .text((d, i) => {
          let year;
          if (d0.length > 1) {
            year = d == 'handle--o' ? d3.min(d0) : d3.max(d0);
          } else {
            year = d == 'handle--o' ? d3.min(d0) : '';
          }
          return year;
        })

      // update bars
      d3.selectAll('.bar').attr('opacity', d => d0.includes(d.monthyear) ? 1 : 0.2);
    }

    function filteredDomain(scale, min, max) {
      let dif = scale(d3.min(scale.domain())) - scale.range()[0],
          iMin = (min - dif) < 0 ? 0 : Math.round((min - dif)/xScale.step()),
          iMax = Math.round((max - dif)/xScale.step());
      if (iMax == iMin) --iMin; // It happens with empty selections.

      return scale.domain().slice(iMin, iMax)
    }
  });
}
getPandemicEvolution();

function percentage(partialValue, totalValue) {
  return (partialValue * 100) / totalValue;
}

function getDataByCountry(data, country) {
  return data.filter(el => el.countryCode === country)
             .map(item => {
                const { date, infections } = item;
                return { year: date, value: infections };
  })
}

function groupeDataByDate(data) {
  const result = data.reduce((r, { year, value }) => {
    let dateObj = new Date(parseDateFormat(year));
    let monthyear = dateObj.toLocaleString("fr-FR", { month: "short", year: 'numeric' });
    if(!r[monthyear]) r[monthyear] = { monthyear, value: value };
    else r[monthyear].value = value;
    return r;
  }, {});

  return Object.values(result);
}

function parseDateFormat(date) {
  const parts = date.split("/");
  return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
}

function snappedSelection(bandScale, domain) {
  const min = d3.min(domain),
        max = d3.max(domain);
  return [bandScale(min), bandScale(max) + bandScale.bandwidth()]
}

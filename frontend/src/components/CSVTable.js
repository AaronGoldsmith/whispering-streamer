import React, { useState, useEffect } from 'react';

function CSVTable({ headers, data}) {
  const [parsedData, setParsedData] = useState([]);

  useEffect(() => {
    // don't set data if no children present
    if (data === null || typeof(data) == "undefined") {
      setParsedData([]);
      return;
    }
    else if(data.length>0){ 
      const rows = data.trim().split('\n');
      const tempData = [];
  
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].split(',');
        // if (row.length === headers.length) {
          const rowData = {};
          for (let j = 0; j < headers.length; j++) {
            rowData[headers[j]] = row[j];
          }
          tempData.push(rowData);
        // }
      }
      setParsedData(tempData);
    }
   

  }, [data]);

  

  const renderTable = () => {
    return (
        <table style={{width: "100%"}}>
         <thead>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {parsedData.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
              
            ))}
          </tbody>
        </table>
    );
  };


  return renderTable();
}

export {CSVTable}

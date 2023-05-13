import React, { useState, useEffect } from 'react';
import '../styles/ResponsiveTable.css'
function CSVTableBody({ headers, data}) {
  const [parsedData, setParsedData] = useState([]);

  useEffect(() => {
    // don't set data if no children present
    if (data === null || typeof(data) == "undefined") {
      setParsedData([]);
      return;
    }
    else if(data.length>0){ 
      // split for csv formatted rows 
      const rows = data.trim().split('\n\n');
      const tempData = [];
  
      for (let i = 1; i < rows.length; i++) {
        const row = rows[i].split(',');
          const rowData = {};
          for (let j = 0; j < headers.length; j++) {
            rowData[headers[j]] = row[j];
          }
          tempData.push(rowData);
      }
      setParsedData(tempData);
    }
   

  }, [data]);

  
  // TODO: take out of a table.
  const renderTable = () => {
    return (
        <>
            <tr>
              {headers.map((header) => (
                <th key={header}>{header}</th>
              ))}
            </tr>
            {parsedData.map((row, index) => (
              <tr key={index}>
                {Object.values(row).map((value, index) => (
                  <td key={index}>{value}</td>
                ))}
              </tr>
              
            ))}
        </>
    );
  };


  return renderTable();
}

export {CSVTableBody}

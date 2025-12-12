<%@ Page Language="C#" AutoEventWireup="true" CodeFile="Return.aspx.cs" Inherits="cashfree_Return" %>

<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title>Payment Status</title>
    <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        #rawJson {
            white-space: pre-wrap;
            background: #f4f4f4;
            border: 1px solid #ccc;
            padding: 10px;
            margin-top: 15px;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">
        <h2>Payment Status</h2>

        <asp:Label ID="lblMessage" runat="server" Text=""></asp:Label>
        <br /><br />
        <asp:Label ID="lblOrderStatus" runat="server" Font-Bold="true"></asp:Label>
        <br /><br />

        <h3>Get Payments API Response (Debug)</h3>
        <asp:Literal ID="litRawJson" runat="server" Mode="Encode"></asp:Literal>
    </form>
</body>
</html>

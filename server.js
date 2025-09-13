// Định nghĩa URL của cơ sở dữ liệu Firebase Realtime Database
var dbUrl = "https://data-real-time-68gb-default-rtdb.asia-southeast1.firebasedatabase.app";

(function () {
  // Lưu trữ tham chiếu đến đối tượng WebSocket gốc của trình duyệt
  var OriginalWebSocket = window.WebSocket;

  // Ghi đè hàm WebSocket để thêm logic xử lý tùy chỉnh
  window.WebSocket = function (url, protocols) {
    // Tạo đối tượng WebSocket mới, hỗ trợ cả trường hợp có và không có protocols
    var ws = protocols ? new OriginalWebSocket(url, protocols) : new OriginalWebSocket(url);

    // Thêm sự kiện lắng nghe khi nhận được tin nhắn từ WebSocket
    ws.addEventListener("message", function (event) {
      try {
        var text;
        // Kiểm tra kiểu dữ liệu của tin nhắn nhận được
        if (event.data instanceof ArrayBuffer) {
          // Nếu dữ liệu là ArrayBuffer, chuyển đổi sang chuỗi UTF-8
          text = new TextDecoder("utf-8").decode(event.data);
        } else if (typeof event.data === "string") {
          // Nếu dữ liệu đã là chuỗi, sử dụng trực tiếp
          text = event.data;
        } else {
          // Nếu dữ liệu không thuộc kiểu hỗ trợ, thoát khỏi hàm
          return;
        }

        // Lấy độ dài của chuỗi dữ liệu
        var len = text.length;
        // Kiểm tra xem tin nhắn có chứa "mnmdsbgamestart" hoặc "mnmdsbgameend"
        if (text.indexOf("mnmdsbgamestart") !== -1 || text.indexOf("mnmdsbgameend") !== -1) {
          // Xác định loại phiên: "start" (bắt đầu) hoặc "end" (kết thúc)
          var sessionType = text.indexOf("mnmdsbgamestart") !== -1 ? "start" : "end";
          // In thông tin phiên ra console (START hoặc END)
          console.log("📥 PHIÊN " + sessionType.toUpperCase() + ":", text);

          // Tạo payload JSON để gửi lên Firebase
          var payload = JSON.stringify({
            time: new Date().toISOString(), // Thời gian hiện tại (định dạng ISO)
            type: sessionType, // Loại phiên (start/end)
            data: text, // Dữ liệu tin nhắn
            length: len, // Độ dài của tin nhắn
          });

          // Gửi dữ liệu lên Firebase Realtime Database
          fetch(dbUrl + "/taixiu_sessions.json", {
            method: "POST", // Phương thức POST để thêm dữ liệu
            headers: { "Content-Type": "application/json" }, // Định dạng JSON
            body: payload, // Nội dung dữ liệu gửi đi
          }).then(function (res) {
            if (res.ok) {
              // Nếu lưu thành công, thông báo ra console
              console.log("✅ Đã lưu phiên " + sessionType.toUpperCase() + " vào Firebase");
            } else {
              // Nếu lưu thất bại, thông báo lỗi và mã trạng thái
              console.error("❌ Lỗi lưu phiên " + sessionType.toUpperCase() + ":", res.status);
            }
          });
        }
      } catch (err) {
        // Xử lý lỗi nếu có vấn đề khi phân tích dữ liệu WebSocket
        console.error("❌ Lỗi khi xử lý WebSocket:", err);
      }
    });

    // Trả về đối tượng WebSocket để duy trì chức năng gốc
    return ws;
  };

  // Đảm bảo prototype của WebSocket tùy chỉnh giống với WebSocket gốc
  window.WebSocket.prototype = OriginalWebSocket.prototype;
})();
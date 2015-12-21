import java.util.*;

public class test {
	public static String[] parse(String str) {
		boolean inQuotation = false; //record inside quotation or not, if so, ignore the white space and continue scan
		char[] ch = str.toCharArray();
		StringBuffer sb = new StringBuffer(); //record current string
		ArrayList<Stirng> res = new ArrayList<String>(); //record return value
		for(int i = 0; i < ch; i++) {
			if(ch[i].equals('"')) {
				if(!inQuotation) { //this is the first quotation mark, set inQuotation to true
					inQuotation = true;
				}
				else { //this is the second quotation mark, should set inQuotation to false and save the string
					inQuotation = false;
					sb.append(ch);
					res.append(sb.toString());
					sb.setLength(0);
				}
			}
			else if(ch[i].equals(' ')) {
				if(!inQuotation && sb.length() != 0) {
					res.append(sb.toString());
					sb.setLength(0);
				}
				//else continue;
			}
			sb.append(ch);
		}
		if(inQuotation) res.appendAll(sb.toString().split(" "));
		return res.toArray(new String[res.size()]);
	}

	public static void main(String[] argc) {
		String s = "12 23 34 \"9 9 9\"";
		String[] re = parse(s);
		for(String str : re)
			System.out.println(str);
	}
}